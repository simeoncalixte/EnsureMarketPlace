/**
 * Common email-connector types.
 *
 * A `MailboxClient` is the provider-agnostic interface the ingestion pipeline
 * talks to. Gmail and Microsoft Graph each implement it. The polling strategy
 * (see src/pipeline/strategies.ts EmailStrategy) only depends on this surface,
 * so a push/webhook driver can be added later without changing callers.
 */

export type ProviderName = 'google' | 'microsoft';

/**
 * Everything needed to talk to a mailbox on behalf of a connected account.
 * Read out of `IngestionChannel.config.oauth` via the credentials seam
 * (see ./credentials.ts) — never read directly elsewhere, so encryption can be
 * added in one place later.
 */
export interface MailboxCredentials {
  provider: ProviderName;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  /** Microsoft only: 'common' | 'organizations' | tenant GUID. */
  tenantId?: string;
  /** Mailbox/userPrincipalName the messages belong to. Gmail uses 'me'. */
  mailbox?: string;
  /** Cached access token (populated by getAccessToken / refresh). */
  accessToken?: string;
  /** Epoch ms at which the cached access token expires. */
  accessTokenExpiresAt?: number;
  /** Optional per-channel scope override; otherwise provider defaults apply. */
  scopes?: string[];
  /** When true the client may use write scopes (mark-as-read / labels). */
  allowWrite?: boolean;
}

export interface MessageAttachment {
  fileName: string;
  mimeType: string | null;
  /** Standard base64 (NOT base64url) so it feeds the existing ingestion path. */
  contentBase64: string;
}

export interface NormalizedMessage {
  /** Provider message id. */
  id: string;
  from: string | null;
  to: string[];
  subject: string | null;
  receivedAt: Date | null;
  bodyText: string | null;
  bodyHtml: string | null;
  attachments: MessageAttachment[];
}

export interface ListResult {
  /** Ids of new messages since `cursor` (best-effort ascending by received time). */
  messageIds: string[];
  /**
   * Provider-specific opaque cursor to persist for the next poll:
   * Gmail historyId, Graph deltaLink. `null` => keep the previous cursor.
   */
  nextCursor: string | null;
}

/** Patch handed to the persistence callback when tokens are refreshed/rotated. */
export type TokenPatch = Partial<
  Pick<MailboxCredentials, 'refreshToken' | 'accessToken' | 'accessTokenExpiresAt'>
>;

export type OnTokenRefresh = (patch: TokenPatch) => void | Promise<void>;

/** Non-secret per-channel options that shape how a mailbox is read. */
export interface MailboxOptions {
  onTokenRefresh?: OnTokenRefresh;
  /** Gmail search query (e.g. "newer_than:7d is:unread") applied on first/recovery list. */
  query?: string;
  /** Folder to read. Graph mailFolder (default "Inbox"); reserved for Gmail label filtering. */
  folder?: string;
}

export interface MailboxClient {
  readonly provider: ProviderName;
  /** Returns a valid bearer token, refreshing silently if expired. */
  getAccessToken(): Promise<string>;
  /** Incremental listing. `cursor` is provider-specific (or null for first run). */
  listNewMessages(cursor: string | null, max: number): Promise<ListResult>;
  /** Fetch + normalize one message including decoded attachments + body. */
  getMessage(id: string): Promise<NormalizedMessage>;
  /** Idempotency aid: mark read / label. No-op unless write is enabled. */
  markProcessed(id: string): Promise<void>;
  /** Cheap liveness probe used by the test-connection route. */
  verifyConnection(): Promise<{ ok: boolean; mailbox?: string | null }>;
}

/** Raised when a refresh_token is no longer valid (revoked / expired). */
export class ReauthRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReauthRequiredError';
  }
}
