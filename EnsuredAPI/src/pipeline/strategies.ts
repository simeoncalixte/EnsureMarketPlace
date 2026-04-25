import path from 'path';
import os from 'os';
import { IngestionChannel } from '../db/models';
import { IngestionService } from './ingestion/service';
import { amqpConnector } from './connectors/amqp';
import { sftpConnector } from './connectors/sftp';

export interface IngestionStrategy {
  ensureSubmissions(channel: typeof IngestionChannel.prototype, batchSize?: number): Promise<number>;
}

export function getStrategyForChannel(channel: typeof IngestionChannel.prototype): IngestionStrategy {
  const type = (channel && typeof channel.get === 'function') ? ((channel.get('type') as string) ?? '').toLowerCase() : '';
  if (type === 'sftp') return new SftpStrategy();
  if (type === 'amqp' || type === 'rabbitmq') return new AmqpStrategy();
  return new DefaultDbStrategy();
}

class DefaultDbStrategy implements IngestionStrategy {
  async ensureSubmissions(_channel: typeof IngestionChannel.prototype, _batchSize = 10): Promise<number> {
    // Default: submissions are expected to already exist in the DB for this channel
    return 0;
  }
}

class AmqpStrategy implements IngestionStrategy {
  private ingestion = new IngestionService();

  async ensureSubmissions(channel: typeof IngestionChannel.prototype, batchSize = 10): Promise<number> {
    const config = (channel.get('config') as Record<string, any>) ?? {};
    let queueNames: string[] = [];
    if (Array.isArray(config.queueNames)) queueNames = config.queueNames as string[];
    else if (typeof config.queueName === 'string') queueNames = [config.queueName as string];
    else if (typeof config.queue === 'string') queueNames = [config.queue as string];
    if (!queueNames || queueNames.length === 0) {
      const fallback = process.env.AMQP_INGEST_QUEUE ?? process.env.AMQP_QUEUE ?? 'ingest_submissions';
      queueNames = [fallback];
    }

    try {
      await amqpConnector.connect();
    } catch (e) {
      console.error('AMQP connect failed in AmqpStrategy', e);
      return 0;
    }
    const ch = (amqpConnector as any).channel;
    if (!ch || typeof ch.get !== 'function') return 0;

    let created = 0;
    const perQueue = Math.max(1, Math.ceil(batchSize / queueNames.length));

    for (const q of queueNames) {
      try { await amqpConnector.assertQueue(q); } catch (_) {}
      for (let i = 0; i < perQueue && created < batchSize; i++) {
        let msg: any;
        try {
          msg = await ch.get(q, { noAck: false });
        } catch (e) {
          console.warn('AMQP get failed', e);
          break;
        }
        if (!msg) break;
        let payload: any;
        try {
          payload = JSON.parse(msg.content.toString());
        } catch (_) {
          payload = msg.content.toString();
        }
        try {
          const createdSubmission = await this.ingestion.createSubmissionFromAmqpPayload(channel, payload);
          if (createdSubmission && (createdSubmission as any).id) {
            created += 1;
            try { ch.ack(msg); } catch (_) {}
          } else {
            try { ch.ack(msg); } catch (_) {}
          }
        } catch (e) {
          console.error('Failed to create submission from AMQP message', e);
          const deadLetterQueue = typeof config.deadLetterQueue === 'string' && config.deadLetterQueue.length ? config.deadLetterQueue : (process.env.AMQP_DEAD_LETTER_QUEUE ?? 'ingestion_dead');
          try { await amqpConnector.publishToQueue(deadLetterQueue, { _lastError: String(e), raw: (payload ?? msg.content.toString()) }); } catch (_) {}
          try { ch.ack(msg); } catch (_) {}
        }
      }
    }

    return created;
  }
}

class SftpStrategy implements IngestionStrategy {
  private ingestion = new IngestionService();

  async ensureSubmissions(channel: typeof IngestionChannel.prototype, batchSize = 10): Promise<number> {
    const config = (channel.get('config') as Record<string, any>) ?? {};
    const rootPath = String(config.rootPath ?? config.remotePath ?? config.path ?? '/');
    const archivePath = config.archivePath ? String(config.archivePath) : undefined;
    const connectionOpts = {
      host: config.host ?? undefined,
      port: config.port ? Number(config.port) : undefined,
      username: config.username ?? undefined,
      password: config.password ?? undefined,
      privateKey: config.privateKey ?? undefined,
      passphrase: config.passphrase ?? undefined,
    };

    try {
      await sftpConnector.connect(connectionOpts as any);
    } catch (e) {
      console.error('SFTP connect failed', e);
      return 0;
    }

    let created = 0;
    try {
      const list = await sftpConnector.list(rootPath);
      for (const entry of list) {
        if (created >= batchSize) break;
        try {
          const entryName = (entry as any).name;
          const entryType = (entry as any).type; // 'd' or '-'
          const entryPath = path.posix.join(rootPath, entryName);
          if (entryType === 'd') {
            const children = await sftpConnector.list(entryPath);
            const files = children.filter((c: any) => (c.type === '-' || c.type === 'l')).map((c: any) => ({ name: c.name, path: path.posix.join(entryPath, c.name) }));
            if (files.length === 0) continue;
            const payloadLike = { files: files.map((f: any) => ({ fileName: f.name, storagePath: `sftp://${connectionOpts.host ?? ''}${entryPath}/${f.name}` })) };
            await this.ingestion.createSubmissionFromAmqpPayload(channel, payloadLike);
            created += 1;
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
            await this.ingestion.createSubmissionFromAmqpPayload(channel, payloadLike);
            created += 1;
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
      console.error('SFTP list failed', e);
    } finally {
      try { await sftpConnector.end(); } catch (_) {}
    }

    return created;
  }
}
