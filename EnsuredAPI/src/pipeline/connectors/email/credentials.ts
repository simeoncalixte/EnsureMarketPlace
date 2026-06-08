/**
 * Credential / cursor seam over `IngestionChannel.config`.
 *
 * ALL reads and writes of OAuth secrets, polling cursors and the processed-id
 * ring go through this module. Today they live in plaintext JSONB (matching the
 * existing AMQP/SFTP connectors); isolating access here means at-rest encryption
 * can be added in one place later without touching the clients or the strategy.
 */

import type { IngestionChannel } from '../../../db/models';
import { MailboxCredentials, ProviderName, TokenPatch } from './types';

type ChannelLike = {
  get: (key: string) => unknown;
  update?: (values: Record<string, unknown>) => Promise<unknown>;
  set?: (key: string, value: unknown) => unknown;
  save?: () => Promise<unknown>;
};

/** Max number of message ids retained in the dedup ring. */
export const PROCESSED_ID_CAP = 500;

function getConfig(channel: ChannelLike): Record<string, any> {
  const cfg = channel.get('config');
  return cfg && typeof cfg === 'object' ? { ...(cfg as Record<string, any>) } : {};
}

/** Persist a (deep-merged) config back to the channel, regardless of model shape. */
async function writeConfig(channel: ChannelLike, nextConfig: Record<string, any>, extra?: Record<string, unknown>): Promise<void> {
  if (typeof channel.update === 'function') {
    await channel.update({ config: nextConfig, ...(extra ?? {}) });
    return;
  }
  if (typeof channel.set === 'function' && typeof channel.save === 'function') {
    channel.set('config', nextConfig);
    if (extra) for (const [k, v] of Object.entries(extra)) channel.set(k, v);
    await channel.save();
  }
}

/** Map channel.type / config.provider to a normalized provider name. */
export function resolveProvider(channel: ChannelLike): ProviderName {
  const type = String(channel.get('type') ?? '').toLowerCase();
  const cfg = getConfig(channel);
  const hint = String(cfg.provider ?? '').toLowerCase();
  if (type === 'microsoft' || type === 'office365' || hint === 'microsoft' || hint === 'office365' || hint === 'outlook') {
    return 'microsoft';
  }
  if (type === 'gmail' || hint === 'google' || hint === 'gmail') return 'google';
  // 'email' / 'email-sso' fall back to the explicit provider hint, defaulting to google.
  return hint === 'microsoft' ? 'microsoft' : 'google';
}

/**
 * Build MailboxCredentials from the channel config, applying env fallbacks for
 * the OAuth app client id/secret (per-channel config takes precedence).
 */
export function readCredentials(channel: ChannelLike): MailboxCredentials {
  const cfg = getConfig(channel);
  const oauth = (cfg.oauth && typeof cfg.oauth === 'object' ? cfg.oauth : {}) as Record<string, any>;
  const provider = resolveProvider(channel);

  const envClientId = provider === 'google' ? process.env.GMAIL_CLIENT_ID : process.env.MS_CLIENT_ID;
  const envClientSecret = provider === 'google' ? process.env.GMAIL_CLIENT_SECRET : process.env.MS_CLIENT_SECRET;

  return {
    provider,
    clientId: String(oauth.clientId ?? envClientId ?? ''),
    clientSecret: String(oauth.clientSecret ?? envClientSecret ?? ''),
    refreshToken: String(oauth.refreshToken ?? ''),
    tenantId: oauth.tenantId ? String(oauth.tenantId) : (process.env.MS_TENANT || undefined),
    mailbox: cfg.mailbox ? String(cfg.mailbox) : undefined,
    accessToken: oauth.accessToken ? String(oauth.accessToken) : undefined,
    accessTokenExpiresAt: oauth.accessTokenExpiresAt ? Number(oauth.accessTokenExpiresAt) : undefined,
    scopes: Array.isArray(cfg.scopes) ? (cfg.scopes as string[]) : undefined,
    allowWrite: Boolean(cfg.markAsRead || cfg.processedLabel),
  };
}

/** Merge refreshed tokens back into config.oauth. */
export async function persistTokens(channel: ChannelLike, patch: TokenPatch): Promise<void> {
  const cfg = getConfig(channel);
  const oauth = { ...(cfg.oauth && typeof cfg.oauth === 'object' ? cfg.oauth : {}) } as Record<string, any>;
  if (patch.refreshToken !== undefined) oauth.refreshToken = patch.refreshToken;
  if (patch.accessToken !== undefined) oauth.accessToken = patch.accessToken;
  if (patch.accessTokenExpiresAt !== undefined) oauth.accessTokenExpiresAt = patch.accessTokenExpiresAt;
  cfg.oauth = oauth;
  await writeConfig(channel, cfg);
}

/** Read the persisted polling cursor for the channel's provider. */
export function readCursor(channel: ChannelLike): string | null {
  const cfg = getConfig(channel);
  const cursor = (cfg.cursor && typeof cfg.cursor === 'object' ? cfg.cursor : {}) as Record<string, any>;
  const provider = resolveProvider(channel);
  const value = provider === 'google' ? cursor.gmailHistoryId : cursor.graphDeltaLink;
  return value ? String(value) : null;
}

/** Persist the polling cursor for the channel's provider. */
export async function persistCursor(channel: ChannelLike, cursor: string | null): Promise<void> {
  if (cursor === null || cursor === undefined) return;
  const cfg = getConfig(channel);
  const existing = (cfg.cursor && typeof cfg.cursor === 'object' ? cfg.cursor : {}) as Record<string, any>;
  const provider = resolveProvider(channel);
  cfg.cursor = {
    ...existing,
    [provider === 'google' ? 'gmailHistoryId' : 'graphDeltaLink']: cursor,
  };
  await writeConfig(channel, cfg);
}

export function readProcessedIds(channel: ChannelLike): string[] {
  const cfg = getConfig(channel);
  return Array.isArray(cfg.processedMessageIds) ? (cfg.processedMessageIds as string[]) : [];
}

export function hasProcessed(channel: ChannelLike, messageId: string): boolean {
  return readProcessedIds(channel).includes(messageId);
}

/** Append a processed message id to the bounded dedup ring and persist it. */
export async function recordProcessed(channel: ChannelLike, messageId: string): Promise<void> {
  const cfg = getConfig(channel);
  const ids = Array.isArray(cfg.processedMessageIds) ? [...(cfg.processedMessageIds as string[])] : [];
  if (ids.includes(messageId)) return;
  ids.push(messageId);
  // Keep only the most recent PROCESSED_ID_CAP ids.
  cfg.processedMessageIds = ids.slice(-PROCESSED_ID_CAP);
  await writeConfig(channel, cfg);
}

/** Mark the channel as needing re-authorization (refresh token revoked/expired). */
export async function markReauthRequired(channel: ChannelLike, reason?: string): Promise<void> {
  const cfg = getConfig(channel);
  if (reason) cfg.lastAuthError = reason;
  await writeConfig(channel, cfg, { status: 'reauth_required' });
}

/** Persist a freshly captured refresh token + status from the OAuth callback. */
export async function persistAuthorization(
  channel: ChannelLike,
  tokens: { refreshToken: string | null; accessToken: string; expiresIn: number },
): Promise<void> {
  const cfg = getConfig(channel);
  const oauth = { ...(cfg.oauth && typeof cfg.oauth === 'object' ? cfg.oauth : {}) } as Record<string, any>;
  if (tokens.refreshToken) oauth.refreshToken = tokens.refreshToken;
  oauth.accessToken = tokens.accessToken;
  oauth.accessTokenExpiresAt = Date.now() + Math.max(0, tokens.expiresIn - 60) * 1000;
  cfg.oauth = oauth;
  delete cfg.lastAuthError;
  await writeConfig(channel, cfg, { status: 'active' });
}

export type { IngestionChannel };
