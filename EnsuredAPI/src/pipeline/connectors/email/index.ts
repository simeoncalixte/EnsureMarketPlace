/**
 * Email connector entrypoint.
 *
 * `getMailboxClient` returns a provider-agnostic MailboxClient. The ingestion
 * EmailStrategy and the OAuth routes depend only on this surface + ./oauth +
 * ./credentials, so adding a provider or a push driver stays localized here.
 */

import { GmailClient } from './gmail';
import { MicrosoftGraphClient } from './microsoft';
import { MailboxClient, MailboxCredentials, MailboxOptions, ProviderName } from './types';

export function getMailboxClient(
  provider: ProviderName,
  credentials: MailboxCredentials,
  options: MailboxOptions = {},
): MailboxClient {
  if (provider === 'google') return new GmailClient(credentials, options);
  if (provider === 'microsoft') return new MicrosoftGraphClient(credentials, options);
  throw new Error(`Unsupported email provider: ${provider}`);
}

export { GmailClient } from './gmail';
export { MicrosoftGraphClient } from './microsoft';
export * from './types';
export * from './oauth';
export * from './credentials';
