import { IngestionChannel } from '../../db/models';
import { IngestionService } from '../../services/pipeline/ingestion/service';

export const EMAIL_CHANNEL_TYPES = ['email', 'gmail', 'microsoft', 'office365', 'email-sso'];

// Shared so poll start/stop operate on the same in-memory poller registry.
export const ingestionService = new IngestionService();

export function isEmailChannel(channel: typeof IngestionChannel.prototype): boolean {
  return EMAIL_CHANNEL_TYPES.includes(String(channel.get('type') ?? '').toLowerCase());
}

/** Redirect URI registered with the OAuth providers (must match their console config). */
export function oauthRedirectUri(): string {
  const base = (process.env.OAUTH_REDIRECT_BASE_URL ?? '').replace(/\/$/, '');
  return `${base}/api/ingestion-channels/oauth/callback`;
}
