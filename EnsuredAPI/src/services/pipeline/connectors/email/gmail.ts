/**
 * Gmail mailbox client (Gmail REST API v1) over fetch.
 *
 * Incremental sync uses historyId: first run lists recent messages and records
 * the mailbox historyId; subsequent runs use history.list?startHistoryId=. If the
 * stored historyId is too old Gmail returns 404 — we fall back to a full re-list
 * and reset the cursor (dedup is backstopped by processedMessageIds).
 */

import { BaseMailboxClient, base64urlToBase64 } from './base';
import {
  ListResult,
  MailboxCredentials,
  MailboxOptions,
  MessageAttachment,
  NormalizedMessage,
  ProviderName,
} from './types';

const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
const MAX_ATTACHMENT_BYTES = Number(process.env.EMAIL_MAX_ATTACHMENT_BYTES ?? 26_214_400);

interface GmailPart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: Array<{ name: string; value: string }>;
  body?: { size?: number; data?: string; attachmentId?: string };
  parts?: GmailPart[];
}

export class GmailClient extends BaseMailboxClient {
  readonly provider: ProviderName = 'google';

  constructor(creds: MailboxCredentials, options: MailboxOptions = {}) {
    super(creds, options);
  }

  async verifyConnection(): Promise<{ ok: boolean; mailbox?: string | null }> {
    const profile = await this.json<{ emailAddress?: string }>(`${BASE}/profile`);
    return { ok: true, mailbox: profile.emailAddress ?? this.creds.mailbox ?? null };
  }

  async listNewMessages(cursor: string | null, max: number): Promise<ListResult> {
    if (!cursor) return this.fullList(max);
    try {
      return await this.incrementalList(cursor, max);
    } catch (err: any) {
      // 404 => historyId expired/too old; rebuild from a fresh list.
      if (String(err?.message ?? '').includes(' 404 ')) {
        console.warn('[gmail] historyId expired, rebuilding from full list');
        return this.fullList(max);
      }
      throw err;
    }
  }

  /** First-run / recovery listing via messages.list. nextCursor = current historyId. */
  private async fullList(max: number): Promise<ListResult> {
    const ids: string[] = [];
    let pageToken: string | undefined;
    while (ids.length < max) {
      const params = new URLSearchParams({ maxResults: String(Math.min(100, max - ids.length)) });
      const q = this.options.query;
      if (q) params.set('q', q);
      if (pageToken) params.set('pageToken', pageToken);
      const page = await this.json<{ messages?: Array<{ id: string }>; nextPageToken?: string }>(
        `${BASE}/messages?${params.toString()}`,
      );
      for (const m of page.messages ?? []) ids.push(m.id);
      if (!page.nextPageToken || (page.messages ?? []).length === 0) break;
      pageToken = page.nextPageToken;
    }
    const profile = await this.json<{ historyId?: string }>(`${BASE}/profile`);
    // messages.list returns newest-first; reverse to ascending so older mail ingests first.
    return { messageIds: ids.reverse(), nextCursor: profile.historyId ?? null };
  }

  private async incrementalList(startHistoryId: string, max: number): Promise<ListResult> {
    const ids: string[] = [];
    let pageToken: string | undefined;
    let latestHistoryId = startHistoryId;
    while (ids.length < max) {
      const params = new URLSearchParams({
        startHistoryId,
        historyTypes: 'messageAdded',
        maxResults: String(Math.min(100, max - ids.length)),
      });
      if (pageToken) params.set('pageToken', pageToken);
      const page = await this.json<{
        history?: Array<{ messagesAdded?: Array<{ message: { id: string } }> }>;
        historyId?: string;
        nextPageToken?: string;
      }>(`${BASE}/history?${params.toString()}`);
      if (page.historyId) latestHistoryId = page.historyId;
      for (const h of page.history ?? []) {
        for (const added of h.messagesAdded ?? []) {
          if (added.message?.id && !ids.includes(added.message.id)) ids.push(added.message.id);
        }
      }
      if (!page.nextPageToken) break;
      pageToken = page.nextPageToken;
    }
    return { messageIds: ids, nextCursor: latestHistoryId };
  }

  async getMessage(id: string): Promise<NormalizedMessage> {
    const msg = await this.json<{
      id: string;
      internalDate?: string;
      payload?: GmailPart;
    }>(`${BASE}/messages/${encodeURIComponent(id)}?format=full`);

    const headers = msg.payload?.headers ?? [];
    const header = (name: string) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? null;

    let bodyText: string | null = null;
    let bodyHtml: string | null = null;
    const attachments: MessageAttachment[] = [];

    const walk = async (part?: GmailPart): Promise<void> => {
      if (!part) return;
      const mime = part.mimeType ?? '';
      const isAttachment = Boolean(part.filename && part.filename.length > 0);

      if (!isAttachment && mime === 'text/plain' && part.body?.data && bodyText === null) {
        bodyText = Buffer.from(part.body.data, 'base64url').toString('utf8');
      } else if (!isAttachment && mime === 'text/html' && part.body?.data && bodyHtml === null) {
        bodyHtml = Buffer.from(part.body.data, 'base64url').toString('utf8');
      } else if (isAttachment) {
        const size = Number(part.body?.size ?? 0);
        if (size > MAX_ATTACHMENT_BYTES) {
          console.warn(`[gmail] skipping oversized attachment ${part.filename} (${size} bytes)`);
        } else {
          let data = part.body?.data;
          if (!data && part.body?.attachmentId) {
            const att = await this.json<{ data?: string; size?: number }>(
              `${BASE}/messages/${encodeURIComponent(id)}/attachments/${encodeURIComponent(part.body.attachmentId)}`,
            );
            if (Number(att.size ?? 0) > MAX_ATTACHMENT_BYTES) {
              console.warn(`[gmail] skipping oversized attachment ${part.filename}`);
              return;
            }
            data = att.data;
          }
          if (data) {
            attachments.push({
              fileName: part.filename as string,
              mimeType: mime || null,
              contentBase64: base64urlToBase64(data),
            });
          }
        }
      }
      for (const child of part.parts ?? []) await walk(child);
    };

    await walk(msg.payload);
    // Single-part messages put the body directly on payload.body.
    if (bodyText === null && bodyHtml === null && msg.payload?.body?.data) {
      const decoded = Buffer.from(msg.payload.body.data, 'base64url').toString('utf8');
      if ((msg.payload.mimeType ?? '').includes('html')) bodyHtml = decoded;
      else bodyText = decoded;
    }

    return {
      id: msg.id,
      from: header('From'),
      to: (header('To') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
      subject: header('Subject'),
      receivedAt: msg.internalDate ? new Date(Number(msg.internalDate)) : null,
      bodyText,
      bodyHtml,
      attachments,
    };
  }

  async markProcessed(id: string): Promise<void> {
    if (!this.creds.allowWrite) return;
    await this.json(`${BASE}/messages/${encodeURIComponent(id)}/modify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
    });
  }
}
