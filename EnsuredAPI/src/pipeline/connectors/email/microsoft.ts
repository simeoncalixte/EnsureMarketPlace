/**
 * Microsoft Graph mailbox client (Graph v1.0) over fetch.
 *
 * Incremental sync uses delta queries: first run walks
 * /me/mailFolders/{folder}/messages/delta following @odata.nextLink until an
 * @odata.deltaLink is returned (stored as the cursor). Subsequent runs GET the
 * stored deltaLink. An expired delta token yields 410 — we reset to a fresh
 * delta walk (dedup is backstopped by processedMessageIds).
 */

import { BaseMailboxClient } from './base';
import {
  ListResult,
  MailboxCredentials,
  MailboxOptions,
  MessageAttachment,
  NormalizedMessage,
  ProviderName,
} from './types';

const BASE = 'https://graph.microsoft.com/v1.0';
const MAX_ATTACHMENT_BYTES = Number(process.env.EMAIL_MAX_ATTACHMENT_BYTES ?? 26_214_400);

interface GraphMessage {
  id: string;
  subject?: string | null;
  from?: { emailAddress?: { address?: string; name?: string } };
  toRecipients?: Array<{ emailAddress?: { address?: string } }>;
  receivedDateTime?: string;
  body?: { contentType?: string; content?: string };
  hasAttachments?: boolean;
}

interface GraphAttachment {
  '@odata.type'?: string;
  id: string;
  name?: string;
  contentType?: string;
  size?: number;
  contentBytes?: string;
}

export class MicrosoftGraphClient extends BaseMailboxClient {
  readonly provider: ProviderName = 'microsoft';

  constructor(creds: MailboxCredentials, options: MailboxOptions = {}) {
    super(creds, options);
  }

  /** Mailbox path: delegated tokens use /me. */
  private mailboxPath(): string {
    return '/me';
  }

  async verifyConnection(): Promise<{ ok: boolean; mailbox?: string | null }> {
    const me = await this.json<{ mail?: string; userPrincipalName?: string }>(
      `${BASE}/me?$select=id,mail,userPrincipalName`,
    );
    return { ok: true, mailbox: me.mail ?? me.userPrincipalName ?? this.creds.mailbox ?? null };
  }

  async listNewMessages(cursor: string | null, max: number): Promise<ListResult> {
    if (!cursor) return this.deltaWalk(this.firstDeltaUrl(max), max);
    try {
      return await this.deltaWalk(cursor, max);
    } catch (err: any) {
      // 410 Gone => delta token expired; restart a fresh delta walk.
      if (String(err?.message ?? '').includes(' 410 ')) {
        console.warn('[microsoft] delta token expired, restarting delta');
        return this.deltaWalk(this.firstDeltaUrl(max), max);
      }
      throw err;
    }
  }

  private firstDeltaUrl(max: number): string {
    const folder = (this.options.folder || 'inbox').toLowerCase();
    const params = new URLSearchParams({ $select: 'id,receivedDateTime', $top: String(Math.min(50, max)) });
    return `${BASE}${this.mailboxPath()}/mailFolders/${encodeURIComponent(folder)}/messages/delta?${params.toString()}`;
  }

  /** Follow @odata.nextLink accumulating ids; stop at @odata.deltaLink (the next cursor). */
  private async deltaWalk(startUrl: string, max: number): Promise<ListResult> {
    const ids: string[] = [];
    let url: string | undefined = startUrl;
    let deltaLink: string | null = null;
    while (url && ids.length < max) {
      const page: {
        value?: Array<{ id: string }>;
        '@odata.nextLink'?: string;
        '@odata.deltaLink'?: string;
      } = await this.json(url);
      for (const m of page.value ?? []) {
        if (m.id && !ids.includes(m.id)) ids.push(m.id);
      }
      if (page['@odata.deltaLink']) {
        deltaLink = page['@odata.deltaLink'];
        break;
      }
      url = page['@odata.nextLink'];
    }
    return { messageIds: ids, nextCursor: deltaLink };
  }

  async getMessage(id: string): Promise<NormalizedMessage> {
    const path = this.mailboxPath();
    const msg = await this.json<GraphMessage>(
      `${BASE}${path}/messages/${encodeURIComponent(id)}?$select=subject,from,toRecipients,receivedDateTime,body,hasAttachments`,
    );

    const isHtml = (msg.body?.contentType ?? '').toLowerCase() === 'html';
    const bodyHtml = isHtml ? msg.body?.content ?? null : null;
    const bodyText = isHtml ? null : msg.body?.content ?? null;

    const attachments: MessageAttachment[] = [];
    if (msg.hasAttachments) {
      const list = await this.json<{ value?: GraphAttachment[] }>(
        `${BASE}${path}/messages/${encodeURIComponent(id)}/attachments`,
      );
      for (const att of list.value ?? []) {
        if (att['@odata.type'] !== '#microsoft.graph.fileAttachment' || !att.contentBytes) {
          // item / reference attachments are out of scope this round.
          if (att['@odata.type'] && att['@odata.type'] !== '#microsoft.graph.fileAttachment') {
            console.warn(`[microsoft] skipping unsupported attachment type ${att['@odata.type']}`);
          }
          continue;
        }
        if (Number(att.size ?? 0) > MAX_ATTACHMENT_BYTES) {
          console.warn(`[microsoft] skipping oversized attachment ${att.name}`);
          continue;
        }
        attachments.push({
          fileName: att.name ?? `attachment-${att.id}`,
          mimeType: att.contentType ?? null,
          contentBase64: att.contentBytes, // Graph contentBytes is already standard base64
        });
      }
    }

    return {
      id: msg.id,
      from: msg.from?.emailAddress?.address ?? null,
      to: (msg.toRecipients ?? []).map((r) => r.emailAddress?.address ?? '').filter(Boolean),
      subject: msg.subject ?? null,
      receivedAt: msg.receivedDateTime ? new Date(msg.receivedDateTime) : null,
      bodyText,
      bodyHtml,
      attachments,
    };
  }

  async markProcessed(id: string): Promise<void> {
    if (!this.creds.allowWrite) return;
    await this.json(`${BASE}${this.mailboxPath()}/messages/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: true }),
    });
  }
}
