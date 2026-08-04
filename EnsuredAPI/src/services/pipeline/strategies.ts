import { IngestionChannel } from '../../db/models';
import { IngestionService } from './ingestion/service';
import {
  getMailboxClient,
  readCredentials,
  readCursor,
  persistCursor,
  persistTokens,
  hasProcessed,
  recordProcessed,
  resolveProvider,
  markReauthRequired,
  ReauthRequiredError,
} from './connectors/email';

export interface IngestionStrategy {
  ensureSubmissions(channel: typeof IngestionChannel.prototype, batchSize?: number): Promise<number>;
}

export type IngestionStrategyFactory = () => IngestionStrategy;

const strategyFactories = new Map<string, IngestionStrategyFactory>();
let defaultStrategyFactory: IngestionStrategyFactory = () => new DefaultDbStrategy();

/**
 * Register a transport implementation without editing the selection function.
 * This is the ingestion extension point for new channel types (for example an
 * API-polling or S3 transport) and keeps transport selection open for extension.
 */
export function registerIngestionStrategy(types: readonly string[], factory: IngestionStrategyFactory): void {
  for (const type of types) strategyFactories.set(type.trim().toLowerCase(), factory);
}

export function setDefaultIngestionStrategy(factory: IngestionStrategyFactory): void {
  defaultStrategyFactory = factory;
}

export function getStrategyForChannel(channel: typeof IngestionChannel.prototype): IngestionStrategy {
  const type = channel && typeof channel.get === 'function' ? String(channel.get('type') ?? '').trim().toLowerCase() : '';
  return (strategyFactories.get(type) ?? defaultStrategyFactory)();
}

class DefaultDbStrategy implements IngestionStrategy {
  async ensureSubmissions(_channel: typeof IngestionChannel.prototype, _batchSize = 10): Promise<number> {
    // Default: submissions are expected to already exist in the DB for this channel
    return 0;
  }
}

class AmqpStrategy implements IngestionStrategy {
  private ingestion = new IngestionService();

  async ensureSubmissions(channel: typeof IngestionChannel.prototype, _batchSize = 10): Promise<number> {
    // AMQP has exactly one implementation: the durable consumer in
    // IngestionService.  The strategy remains only as a compatibility adapter.
    await this.ingestion.startAmqpListenerForChannel(Number(channel.get('id')));
    return 0;
  }
}

class SftpStrategy implements IngestionStrategy {
  private ingestion = new IngestionService();

  async ensureSubmissions(channel: typeof IngestionChannel.prototype, _batchSize = 10): Promise<number> {
    // SFTP discovery/archive semantics live alongside the poller, preventing
    // a second implementation from drifting from the long-running worker.
    await this.ingestion.startSftpPollingForChannel(Number(channel.get('id')));
    return 0;
  }
}

/**
 * Pull new emails from a Gmail / Microsoft mailbox and turn each into a
 * submission. Idempotency is layered: the provider cursor (historyId / deltaLink)
 * is the primary guard, a bounded processedMessageIds ring is the safety net for
 * cursor rebuilds, and optional mark-as-read further excludes handled mail.
 */
export class EmailStrategy implements IngestionStrategy {
  private ingestion = new IngestionService();

  async ensureSubmissions(channel: typeof IngestionChannel.prototype, batchSize = 10): Promise<number> {
    const config = (channel.get('config') as Record<string, any>) ?? {};
    const provider = resolveProvider(channel);
    const creds = readCredentials(channel);
    if (!creds.refreshToken) {
      console.warn('Email channel not authorized (no refresh token)', channel.get('id'));
      return 0;
    }

    const client = getMailboxClient(provider, creds, {
      onTokenRefresh: (patch) => persistTokens(channel, patch),
      query: typeof config.query === 'string' ? config.query : undefined,
      folder: typeof config.folder === 'string' ? config.folder : undefined,
    });

    const cursor = readCursor(channel);
    let list;
    try {
      list = await client.listNewMessages(cursor, batchSize);
    } catch (err: any) {
      if (err instanceof ReauthRequiredError) {
        await markReauthRequired(channel, err.message);
        console.error('Email channel needs re-authorization', channel.get('id'), err.message);
      } else {
        console.error('listNewMessages failed', channel.get('id'), err?.message ?? err);
      }
      return 0; // leave cursor unchanged so nothing is skipped
    }

    const source = provider === 'google' ? 'gmail' : 'microsoft';
    let created = 0;
    let aborted = false;
    for (const messageId of list.messageIds) {
      if (created >= batchSize) break;
      if (hasProcessed(channel, messageId)) continue;
      try {
        const msg = await client.getMessage(messageId);
        const payloadLike = this.toPayload(msg);
        const submission = await this.ingestion.createSubmissionFromAmqpPayload(channel, payloadLike, {
          transport: 'email',
          source,
          ingestionChannelId: Number(channel.get('id')) || undefined,
        });
        if (submission && (submission as any).id) {
          created += 1;
          await recordProcessed(channel, messageId);
          try { await client.markProcessed(messageId); } catch (_) {}
        }
      } catch (err: any) {
        if (err instanceof ReauthRequiredError) {
          await markReauthRequired(channel, err.message);
          return created; // stop; cursor not advanced
        }
        console.error('Failed to ingest email message', messageId, err?.message ?? err);
        // Per-message hard error: stop and leave the cursor unadvanced so this
        // message is retried on the next poll.
        aborted = true;
        break;
      }
    }

    // Advance the provider cursor only after a clean pass over the batch.
    if (!aborted && list.nextCursor) await persistCursor(channel, list.nextCursor);
    return created;
  }

  /** Map a normalized message into the ingestion payload (body + attachments as files). */
  private toPayload(msg: import('./connectors/email').NormalizedMessage) {
    const files: Array<{ fileName: string; fileType: string | null; contentBase64: string }> = [];
    if (msg.bodyText) {
      files.push({ fileName: 'body.txt', fileType: 'text/plain', contentBase64: Buffer.from(msg.bodyText, 'utf8').toString('base64') });
    } else if (msg.bodyHtml) {
      files.push({ fileName: 'body.html', fileType: 'text/html', contentBase64: Buffer.from(msg.bodyHtml, 'utf8').toString('base64') });
    }
    for (const att of msg.attachments) {
      files.push({ fileName: att.fileName, fileType: att.mimeType, contentBase64: att.contentBase64 });
    }
    return {
      _transport: 'email',
      files,
      email: {
        from: msg.from,
        to: msg.to,
        subject: msg.subject,
        messageId: msg.id,
        receivedAt: msg.receivedAt ? msg.receivedAt.toISOString() : null,
      },
    };
  }
}

// Built-in transport registrations. New transports call registerIngestionStrategy
// from their composition root; getStrategyForChannel itself remains unchanged.
registerIngestionStrategy(['sftp'], () => new SftpStrategy());
registerIngestionStrategy(['amqp', 'rabbitmq'], () => new AmqpStrategy());
registerIngestionStrategy(['email', 'gmail', 'microsoft', 'office365', 'email-sso'], () => new EmailStrategy());
