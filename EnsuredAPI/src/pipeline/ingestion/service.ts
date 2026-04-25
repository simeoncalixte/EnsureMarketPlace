import { Submission, SubmissionFile, IngestionChannel, IngestionEvent } from '../../db/models';
import { getS3Object } from '../connectors/s3';
import { amqpConnector } from '../connectors/amqp';
import { sftpConnector } from '../connectors/sftp';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

export class IngestionService {
  private _amqpConsumerTag?: string | null = null;
  private _amqpConsumers: Record<number, Array<{ queue: string; consumerTag?: string | null }>> = {};
  private _sftpPollers: Record<number, NodeJS.Timeout | null> = {};

  async process(payload: any): Promise<Record<string, unknown>> {
    const submission = payload?.submission;
    if (!submission || !submission.id) return { ok: false, error: 'missing submission' };
    const submissionId = submission.id;
    const files = await SubmissionFile.findAll({ where: { submissionId } });
    const fetched: Array<{ file: any; buffer?: Buffer }> = [];

    for (const f of files) {
      const storagePath = (f.get('storagePath') as string) ?? (f.get('storage_path') as any) ?? '';
      let buf: Buffer | undefined;
      try {
        if (typeof storagePath === 'string' && storagePath.startsWith('s3://')) {
          const s = storagePath.replace('s3://', '');
          const idx = s.indexOf('/');
          const bucket = s.slice(0, idx);
          const key = s.slice(idx + 1);
          buf = await getS3Object(bucket, key);
        } else if (typeof storagePath === 'string' && storagePath.length > 0) {
          try {
            const fs = await import('fs/promises');
            buf = await fs.readFile(storagePath as string);
          } catch (_) {
            buf = undefined;
          }
        }
      } catch (err: any) {
        // non-fatal per-file
        console.warn('Failed to fetch file for ingestion', f.get('id'), String(err));
      }
      fetched.push({ file: f, buffer: buf });
    }

    return { ok: true, files: fetched };
  }

  /**
   * Start consuming submissions from an AMQP queue and process them.
   */
  async startAmqpListener(queueName?: string) {
    // Backwards-compatible single-queue listener
    const q = queueName ?? process.env.AMQP_INGEST_QUEUE ?? 'ingestion_submission';
    const res = await amqpConnector.consumeQueue(q, async (body: any, rawMsg: any) => {
      const payload = typeof body === 'string' ? JSON.parse(body) : body;
      try {
        if (payload && payload.submission && payload.submission.id) {
          await this.process({ ...payload });
          return;
        }
        // create submission from payload when missing
        try {
          const fakeChannel = { get: (k: string) => { if (k === 'config') return {}; if (k === 'tenantId' || k === 'organizationId') return null; if (k === 'type') return 'amqp'; return null; } } as any;
          const created = await this.createSubmissionFromAmqpPayload(fakeChannel, payload).catch(() => null);
          if (created && (created as any).id) {
            await this.process({ submission: { id: (created as any).id }, _ingestionChannelId: null });
            return;
          }
        } catch (e) {
          // fallthrough to error handling
        }
        // fallback: try to process raw payload (may fail)
        await this.process(payload);
      } catch (err) {
        throw err;
      }
    });
    this._amqpConsumerTag = res?.consumerTag ?? null;
    return res;
  }

  async stopAmqpListener() {
    try {
      if (this._amqpConsumerTag && (amqpConnector as any).channel?.cancel) {
        try { await (amqpConnector as any).channel.cancel(this._amqpConsumerTag); } catch (e) {}
      }
    } catch (_) {}
    await amqpConnector.close();
    this._amqpConsumerTag = null;
  }

  /**
   * Start AMQP consumers for a saved IngestionChannel by id.
   * The channel's `config.queueNames` (array) or `config.queueName` (string)
   * will be used. Falls back to env/default queue when none provided.
   */
  async startAmqpListenerForChannel(channelId: number) {
    const channel = await IngestionChannel.findByPk(channelId);
    if (!channel) throw new Error('Channel not found');
    const config = (channel.get('config') as Record<string, unknown>) ?? {};
    const meta = (channel.get('meta') as string) ?? '';
    let queueNames: string[] = [];
    if (Array.isArray(config.queueNames)) queueNames = config.queueNames as string[];
    else if (typeof config.queueName === 'string') queueNames = [config.queueName as string];
    else if (typeof config.queue === 'string') queueNames = [config.queue as string];
    // if none configured, fallback to environment or default
    if (!queueNames || queueNames.length === 0) {
      const fallback = process.env.AMQP_INGEST_QUEUE ?? process.env.AMQP_QUEUE ?? 'ingestion_submissions';
      queueNames = [fallback];
    }

    this._amqpConsumers[channelId] = [];
    for (const q of queueNames) {
      // Wrap handler to implement per-channel retry/backoff and dead-lettering
      const res = await amqpConnector.consumeQueue(q, async (body: any, rawMsg: any) => {
        const payload = typeof body === 'string' ? JSON.parse(body) : body;
        const attemptsSoFar = Number(payload?._ingestionAttempts ?? 0);
        const nextAttempt = attemptsSoFar + 1;
        const config = (channel.get('config') as Record<string, any>) ?? {};
        const maxRetries = Number(config.maxRetries ?? process.env.AMQP_MAX_RETRIES ?? 3);
        const baseBackoffMs = Number(config.baseBackoffMs ?? process.env.AMQP_BACKOFF_MS ?? 1000);
        const backoffMultiplier = Number(config.backoffMultiplier ?? 2);
        const maxBackoffMs = Number(config.maxBackoffMs ?? process.env.AMQP_MAX_BACKOFF_MS ?? 60000);
        const retryQueue = typeof config.retryQueue === 'string' && config.retryQueue.length ? config.retryQueue : q;
        const deadLetterQueue = typeof config.deadLetterQueue === 'string' && config.deadLetterQueue.length ? config.deadLetterQueue : (process.env.AMQP_DEAD_LETTER_QUEUE ?? 'ingestion_dead');

        try {
          // If message already contains a submission id, pass through
          if (payload && payload.submission && payload.submission.id) {
            await this.process({ ...payload, _ingestionChannelId: channelId });
            // success: connector will ack
            return;
          }

          // Otherwise create a Submission record from the payload according to channel config
          try {
            const created = await this.createSubmissionFromAmqpPayload(channel, payload);
            await this.process({ submission: { id: (created as any).id }, _ingestionChannelId: channelId });
            return;
          } catch (subErr) {
            // fall through to outer catch to trigger retry/DLQ logic
            throw subErr;
          }
        } catch (err: any) {
          // decide retry vs DLQ
          try {
            if (nextAttempt <= maxRetries) {
              const backoffMs = Math.min(maxBackoffMs, Math.round(baseBackoffMs * Math.pow(backoffMultiplier, nextAttempt - 1)));
              // schedule republish to retryQueue with incremented attempts
              setTimeout(async () => {
                try {
                  await amqpConnector.publishToQueue(retryQueue, { ...payload, _ingestionAttempts: nextAttempt });
                } catch (pubErr) {
                  console.error('Failed to publish retry message', pubErr);
                }
              }, backoffMs);
              // swallow original error so connector acks the original message
              return;
            }

            // exceeded retries -> publish to DLQ immediately
            try {
              await amqpConnector.publishToQueue(deadLetterQueue, { ...payload, _ingestionAttempts: nextAttempt, _lastError: err?.message ?? String(err) });
            } catch (pubErr) {
              console.error('Failed to publish to DLQ', pubErr);
            }
            return;
          } catch (innerErr) {
            console.error('Error handling AMQP retry/dlq logic', innerErr);
            return;
          }
        }
      });
      this._amqpConsumers[channelId].push({ queue: q, consumerTag: res?.consumerTag ?? null });
    }
    return this._amqpConsumers[channelId];
  }

  /**
   * Create a Submission and related SubmissionFile rows from a message payload.
   */
  async createSubmissionFromAmqpPayload(channel: typeof IngestionChannel.prototype, payload: any) {
    const config = (channel && typeof channel.get === 'function') ? (channel.get('config') as Record<string, any>) ?? {} : {};
    // Resolve organization id with the following precedence:
    // 1. payload.organizationId | payload.orgId | payload.tenantId
    // 2. channel.config.organizationId
    // 3. channel.organizationId (legacy) or channel.tenantId (legacy stored value)
    const chanOrg = (channel && typeof channel.get === 'function') ? ((channel.get('organizationId') as number) ?? (channel.get('tenantId') as number) ?? null) : ((channel as any)?.tenantId ?? null);
    const rawOrg = payload?.submission.tenantId ?? null;
    let organizationId: number | null = null;
    if (rawOrg !== undefined && rawOrg !== null) {
      const n = Number(rawOrg);
      if (!Number.isNaN(n) && n > 0) organizationId = n;
    }
    if (!organizationId && chanOrg) organizationId = Number(chanOrg) || null;

    const insurerProfileId = Number(config?.insurerProfileId ?? config?.organizationId ?? organizationId ?? 0) || 0;
    const portfolioId = Number(config?.portfolioId ?? 0) || 0;

    const submission = await Submission.create({
      insurerProfileId,
      portfolioId,
      submittedByUserId: null,
      status: 'submitted',
      tenantId: organizationId,
      source: (channel && typeof channel.get === 'function') ? (channel.get('type') as string) ?? 'amqp' : 'amqp',
      transport: 'amqp',
      receivedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Normalize files candidates
    const files: any[] = [];
    if (Array.isArray(payload?.files)) files.push(...payload.files);
    if (payload?.file) files.push(payload.file);
    if (payload?.attachment) files.push(payload.attachment);

    const createdFiles: any[] = [];
    if (files.length > 0) {
      const baseDir = path.join(os.tmpdir(), 'ensured-ingest', `submission-${submission.id}`);
      try { await fs.mkdir(baseDir, { recursive: true }); } catch (_) {}
      for (const f of files) {
        try {
          let storagePath = '';
          const fileName = f.fileName ?? f.name ?? 'file.bin';
          const fileType = f.fileType ?? null;
          let fileSize: number | null = null;

          if (f.storagePath) {
            storagePath = String(f.storagePath);
          } else if (f.s3 && f.s3.bucket && f.s3.key) {
            storagePath = `s3://${f.s3.bucket}/${f.s3.key}`;
          } else if (f.url) {
            storagePath = String(f.url);
          } else if (f.contentBase64) {
            const buf = Buffer.from(String(f.contentBase64), 'base64');
            const dest = path.join(baseDir, fileName);
            await fs.writeFile(dest, buf);
            storagePath = dest;
            fileSize = buf.length;
          }

          const sf = await SubmissionFile.create({
            submissionId: submission.id,
            tenantId: organizationId,
            fileName: fileName ?? null,
            fileType: fileType ?? null,
            fileSize: fileSize ?? null,
            storagePath: storagePath ?? '',
            checksum: null,
            uploadedAt: new Date(),
          });
          createdFiles.push(sf);
        } catch (e) {
          console.warn('Failed to persist attachment for submission', submission.id, e?.message ?? e);
        }
      }
    }

    try {
      await IngestionEvent.create({ submissionId: submission.id, tenantId: submission.tenantId ?? null, stage: 'received', status: 'submitted', metadata: { payloadSummary: { fileCount: createdFiles.length } } });
    } catch (_) {}

    return submission;
  }

  /**
   * Poll an SFTP server for submissions based on channel config.
   */
  async startSftpPollingForChannel(channelId: number) {
    const channel = await IngestionChannel.findByPk(channelId);
    if (!channel) throw new Error('Channel not found');
    const config = (channel.get('config') as Record<string, any>) ?? {};
    const rootPath = String(config.rootPath ?? config.remotePath ?? config.path ?? '/');
    const archivePath = config.archivePath ? String(config.archivePath) : undefined;
    const pollIntervalMs = Number(config.pollIntervalMs ?? process.env.SFTP_POLL_INTERVAL_MS ?? 30000);

    if (this._sftpPollers[channelId]) {
      try { clearInterval(this._sftpPollers[channelId] as NodeJS.Timeout); } catch (_) {}
    }

    const connectionOpts = {
      host: config.host ?? undefined,
      port: config.port ? Number(config.port) : undefined,
      username: config.username ?? undefined,
      password: config.password ?? undefined,
      privateKey: config.privateKey ?? undefined,
      passphrase: config.passphrase ?? undefined,
    };

    const pollFn = async () => {
      try {
        await sftpConnector.connect(connectionOpts as any);
        const list = await sftpConnector.list(rootPath);
        for (const entry of list) {
          try {
            const entryName = (entry as any).name;
            const entryType = (entry as any).type; // 'd' for dir, '-' for file
            const entryPath = path.posix.join(rootPath, entryName);
            if (entryType === 'd') {
              const children = await sftpConnector.list(entryPath);
              const files = children.filter((c: any) => (c.type === '-' || c.type === 'l')).map((c: any) => ({ name: c.name, path: path.posix.join(entryPath, c.name) }));
              if (files.length === 0) continue;
              const payloadLike = { files: files.map((f: any) => ({ fileName: f.name, storagePath: `sftp://${connectionOpts.host ?? ''}${entryPath}/${f.name}` })) };
              await this.createSubmissionFromAmqpPayload(channel, payloadLike);
              if (archivePath) {
                const destDir = path.posix.join(archivePath, entryName);
                for (const f of children) {
                  try {
                    const src = path.posix.join(entryPath, f.name);
                    const buf = await sftpConnector.get(src);
                    const dest = path.posix.join(destDir, f.name);
                    await sftpConnector.put(buf, dest);
                    await sftpConnector.delete(src);
                  } catch (e) {
                    console.warn('Failed to archive sftp file', f.name, e?.message ?? e);
                  }
                }
                try { await sftpConnector.delete(entryPath); } catch (_) {}
              }
            } else if (entryType === '-' || !entryType) {
              const payloadLike = { files: [{ fileName: entryName, storagePath: `sftp://${connectionOpts.host ?? ''}${entryPath}` }] };
              await this.createSubmissionFromAmqpPayload(channel, payloadLike);
              if (archivePath) {
                try {
                  const src = entryPath;
                  const buf = await sftpConnector.get(src);
                  const dest = path.posix.join(archivePath, entryName);
                  await sftpConnector.put(buf, dest);
                  await sftpConnector.delete(src);
                } catch (e) {
                  console.warn('Failed to archive sftp file', entryName, e?.message ?? e);
                }
              }
            }
          } catch (e) {
            console.warn('Error handling sftp entry', (entry as any).name, e?.message ?? e);
          }
        }
      } catch (e) {
        console.error('SFTP poll error for channel', channelId, e?.message ?? e);
      }
    };

    await pollFn();
    const timer = setInterval(() => { pollFn().catch((err) => console.error('SFTP poller error', err)); }, pollIntervalMs);
    this._sftpPollers[channelId] = timer as NodeJS.Timeout;
    return timer;
  }

  async stopSftpPollingForChannel(channelId: number) {
    const timer = this._sftpPollers[channelId];
    if (timer) {
      try { clearInterval(timer); } catch (_) {}
    }
    delete this._sftpPollers[channelId];
    try { await sftpConnector.end(); } catch (_) {}
  }

  async stopAmqpListenerForChannel(channelId: number) {
    const entries = this._amqpConsumers[channelId] ?? [];
    try {
      for (const e of entries) {
        if (e.consumerTag && (amqpConnector as any).channel?.cancel) {
          try { await (amqpConnector as any).channel.cancel(e.consumerTag); } catch (er) {}
        }
      }
    } catch (_) {}
    delete this._amqpConsumers[channelId];
    await amqpConnector.close();
  }
}
