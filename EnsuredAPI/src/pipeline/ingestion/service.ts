import { Submission, SubmissionFile, IngestionChannel, IngestionEvent } from '../../db/models';
import { getS3Object } from '../connectors/s3';
import { amqpConnector } from '../connectors/amqp';
import { sftpConnector } from '../connectors/sftp';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

type RetryPolicy = {
  maxRetries: number;
  baseBackoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
  retryQueue: string;
  deadLetterQueue: string;
};

function parseAmqpPayload(body: any): any {
  return typeof body === 'string' ? JSON.parse(body) : body;
}

function hasSubmissionId(payload: any): boolean {
  return Boolean(payload && payload.submission && payload.submission.id);
}

function getNextAttempt(payload: any): number {
  const attemptsSoFar = Number(payload?._ingestionAttempts ?? 0);
  return attemptsSoFar + 1;
}

function resolveRetryPolicy(config: Record<string, any>, queueName: string): RetryPolicy {
  return {
    maxRetries: Number(config.maxRetries ?? process.env.AMQP_MAX_RETRIES ?? 3),
    baseBackoffMs: Number(config.baseBackoffMs ?? process.env.AMQP_BACKOFF_MS ?? 1000),
    backoffMultiplier: Number(config.backoffMultiplier ?? 2),
    maxBackoffMs: Number(config.maxBackoffMs ?? process.env.AMQP_MAX_BACKOFF_MS ?? 60000),
    retryQueue: typeof config.retryQueue === 'string' && config.retryQueue.length ? config.retryQueue : queueName,
    deadLetterQueue:
      typeof config.deadLetterQueue === 'string' && config.deadLetterQueue.length
        ? config.deadLetterQueue
        : (process.env.AMQP_DEAD_LETTER_QUEUE ?? 'ingestion_dead'),
  };
}

function computeBackoffMs(policy: RetryPolicy, nextAttempt: number): number {
  return Math.min(
    policy.maxBackoffMs,
    Math.round(policy.baseBackoffMs * Math.pow(policy.backoffMultiplier, nextAttempt - 1)),
  );
}

function withAttempt(payload: any, nextAttempt: number): any {
  return { ...payload, _ingestionAttempts: nextAttempt };
}

function withDlqError(payload: any, nextAttempt: number, err: any): any {
  return { ...payload, _ingestionAttempts: nextAttempt, _lastError: err?.message ?? String(err) };
}

function createFallbackAmqpChannel() {
  return {
    get: (key: string) => {
      if (key === 'config') return {};
      if (key === 'tenantId' || key === 'organizationId') return null;
      if (key === 'type') return 'amqp';
      return null;
    },
  };
}

export class IngestionService {
  private _amqpConsumerTag?: string | null = null;
  private _amqpConsumers: Record<number, Array<{ queue: string; consumerTag?: string | null }>> = {};
  private _sftpPollers: Record<number, NodeJS.Timeout | null> = {};
  private _emailPollers: Record<number, NodeJS.Timeout | null> = {};

  async process(payload: any): Promise<Record<string, unknown>> {
    const submission = payload?.submission;
    if (!submission || !submission.id) {
      return { ok: true, service: 'ingestion', noop: true, reason: 'missing submission' };
    }
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

    return { ok: true, service: 'ingestion', files: fetched };
  }

  /**
   * Start consuming submissions from an AMQP queue and process them.
   */
  async startAmqpListener(queueName?: string) {
    // Backwards-compatible single-queue listener
    const q = queueName ?? process.env.AMQP_INGEST_QUEUE ?? 'ingestion_submission';
    const res = await amqpConnector.consumeQueue(q, async (body: any, rawMsg: any) => this.handleLegacyAmqpMessage(body));
    this._amqpConsumerTag = res?.consumerTag ?? null;
    return res;
  }

  private async handleLegacyAmqpMessage(body: any) {
    const payload = parseAmqpPayload(body);
    if (hasSubmissionId(payload)) {
      await this.process({ ...payload });
      return;
    }

    try {
      const created = await this.createSubmissionFromAmqpPayload(createFallbackAmqpChannel() as any, payload).catch(() => null);
      if (created && (created as any).id) {
        await this.process({ submission: { id: (created as any).id }, _ingestionChannelId: null });
        return;
      }
    } catch (_) {
      // fallback below
    }

    await this.process(payload);
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
   * Resolve queue names from channel config, with fallback to environment or default
   */
  private resolveQueueNames(config: Record<string, any>): string[] {
    let queueNames: string[] = [];
    if (Array.isArray(config.queueNames)) queueNames = config.queueNames as string[];
    else if (typeof config.queueName === 'string') queueNames = [config.queueName as string];
    else if (typeof config.queue === 'string') queueNames = [config.queue as string];
    
    if (!queueNames || queueNames.length === 0) {
      const fallback = process.env.AMQP_INGEST_QUEUE ?? process.env.AMQP_QUEUE ?? 'ingestion_submissions';
      queueNames = [fallback];
    }
    return queueNames;
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
    const queueNames = this.resolveQueueNames(config as Record<string, any>);

    this._amqpConsumers[channelId] = [];
    for (const q of queueNames) {
      const res = await amqpConnector.consumeQueue(q, async (body: any, rawMsg: any) => this.handleChannelAmqpMessage(channel, channelId, q, body));
      this._amqpConsumers[channelId].push({ queue: q, consumerTag: res?.consumerTag ?? null });
    }
    return this._amqpConsumers[channelId];
  }

  private async handleChannelAmqpMessage(channel: typeof IngestionChannel.prototype, channelId: number, queueName: string, body: any) {
    const payload = parseAmqpPayload(body);
    const config = (channel.get('config') as Record<string, any>) ?? {};
    const retryPolicy = resolveRetryPolicy(config, queueName);
    const nextAttempt = getNextAttempt(payload);

    try {
      if (hasSubmissionId(payload)) {
        await this.process({ ...payload, _ingestionChannelId: channelId });
        return;
      }

      const created = await this.createSubmissionFromAmqpPayload(channel, payload);
      await this.process({ submission: { id: (created as any).id }, _ingestionChannelId: channelId });
    } catch (err: any) {
      await this.handleAmqpRetryOrDlq(payload, nextAttempt, retryPolicy, err);
    }
  }

  private async handleAmqpRetryOrDlq(payload: any, nextAttempt: number, retryPolicy: RetryPolicy, err: any) {
    try {
      if (nextAttempt <= retryPolicy.maxRetries) {
        const backoffMs = computeBackoffMs(retryPolicy, nextAttempt);
        setTimeout(async () => {
          try {
            await amqpConnector.publishToQueue(retryPolicy.retryQueue, withAttempt(payload, nextAttempt));
          } catch (pubErr) {
            console.error('Failed to publish retry message', pubErr);
          }
        }, backoffMs);
        return;
      }

      try {
        await amqpConnector.publishToQueue(retryPolicy.deadLetterQueue, withDlqError(payload, nextAttempt, err));
      } catch (pubErr) {
        console.error('Failed to publish to DLQ', pubErr);
      }
    } catch (innerErr) {
      console.error('Error handling AMQP retry/dlq logic', innerErr);
    }
  }

  /**
   * Create a Submission and related SubmissionFile rows from a message payload.
   */
  async createSubmissionFromAmqpPayload(
    channel: typeof IngestionChannel.prototype,
    payload: any,
    opts?: { transport?: string; source?: string; ingestionChannelId?: number },
  ) {
    const config = (channel && typeof channel.get === 'function') ? (channel.get('config') as Record<string, any>) ?? {} : {};
    // Resolve organization id with the following precedence:
    // 1. payload.organizationId | payload.orgId | payload.tenantId
    // 2. channel.config.organizationId
    // 3. channel.organizationId (legacy) or channel.tenantId (legacy stored value)
    const chanOrg = (channel && typeof channel.get === 'function') ? ((channel.get('organizationId') as number) ?? (channel.get('tenantId') as number) ?? null) : ((channel as any)?.tenantId ?? null);
    const payloadSubmission = (payload && typeof payload.submission === 'object') ? payload.submission : {};
    const rawOrg = payloadSubmission.tenantId ?? payload?.tenantId ?? null;
    let organizationId: number | null = null;
    if (rawOrg !== undefined && rawOrg !== null) {
      const n = Number(rawOrg);
      if (!Number.isNaN(n) && n > 0) organizationId = n;
    }
    if (!organizationId && chanOrg) organizationId = Number(chanOrg) || null;

    const insurerProfileId = Number(config?.insurerProfileId ?? 0) || null;
    const portfolioId = Number(config?.portfolioId ?? 0) || null;

    const channelType = (channel && typeof channel.get === 'function') ? (channel.get('type') as string) : null;
    // Transport/source default to the AMQP behavior so existing callers are unchanged;
    // inbound connectors (e.g. email) override via opts or payload._transport.
    const transport = opts?.transport ?? payload?._transport ?? 'amqp';
    const source = opts?.source ?? channelType ?? 'amqp';
    // Link the submission back to its channel so GET /ingestion-channels/:id/submissions
    // can find it. Previously never set, so AMQP/SFTP submissions were orphaned.
    const channelId = opts?.ingestionChannelId
      ?? ((channel && typeof channel.get === 'function') ? (Number(channel.get('id')) || null) : null);

    const submission = await Submission.create({
      insurerProfileId,
      portfolioId,
      submittedByUserId: Number(payloadSubmission.submittedByUserId ?? payload?.submittedByUserId ?? 0) || null,
      status: 'submitted',
      tenantId: organizationId,
      source,
      transport,
      ingestionChannelId: channelId,
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
      const metadata: Record<string, unknown> = { payloadSummary: { fileCount: createdFiles.length, transport } };
      if (payload?.email && typeof payload.email === 'object') metadata.email = payload.email;
      await IngestionEvent.create({ submissionId: submission.id, tenantId: submission.tenantId ?? null, stage: 'received', status: 'submitted', metadata });
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

  /**
   * Poll a Gmail / Microsoft mailbox for new messages and turn them into
   * submissions. Mirrors the SFTP poller: initial poll + interval, re-reading
   * the channel each tick so a disable/delete takes effect promptly.
   */
  async startEmailPollingForChannel(channelId: number) {
    const channel = await IngestionChannel.findByPk(channelId);
    if (!channel) throw new Error('Channel not found');
    const config = (channel.get('config') as Record<string, any>) ?? {};
    const pollIntervalMs = Number(config.pollIntervalMs ?? process.env.EMAIL_POLL_INTERVAL_MS ?? 60000);
    const batchSize = Number(config.batchSize ?? 10);

    if (this._emailPollers[channelId]) {
      try { clearInterval(this._emailPollers[channelId] as NodeJS.Timeout); } catch (_) {}
    }

    // Lazy import avoids a static import cycle (strategies.ts imports this service).
    const { getStrategyForChannel } = await import('../strategies');

    const pollFn = async () => {
      try {
        const fresh = await IngestionChannel.findByPk(channelId);
        if (!fresh || !fresh.get('enabled')) return;
        // Stop hammering a mailbox whose authorization was revoked; wait for re-auth.
        if (fresh.get('status') === 'reauth_required') return;
        const strategy = getStrategyForChannel(fresh);
        await strategy.ensureSubmissions(fresh, batchSize);
      } catch (e: any) {
        console.error('Email poll error for channel', channelId, e?.message ?? e);
      }
    };

    await pollFn();
    const timer = setInterval(() => { pollFn().catch((err) => console.error('Email poller error', err)); }, pollIntervalMs);
    this._emailPollers[channelId] = timer as NodeJS.Timeout;
    return timer;
  }

  async stopEmailPollingForChannel(channelId: number) {
    const timer = this._emailPollers[channelId];
    if (timer) {
      try { clearInterval(timer); } catch (_) {}
    }
    delete this._emailPollers[channelId];
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
