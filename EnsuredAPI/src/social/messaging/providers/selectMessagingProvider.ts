import { MessagingProviderName } from '../../../db/models/social.models';
import { MessagingProvider } from './MessagingProvider';
import { SimulatedProvider } from './SimulatedProvider';
import { TelegramProvider } from './TelegramProvider';
import { WhatsAppProvider } from './WhatsAppProvider';

/**
 * Provider priority per channel (the **strategy**): the real adapter wins when
 * its env credentials are configured, otherwise the simulated adapter keeps
 * the flow alive. Mirrors `connectors/geocoding/selectGeocodeProvider.ts`.
 */
export function defaultMessagingProviders(
  channel: MessagingProviderName,
  env: NodeJS.ProcessEnv = process.env,
): MessagingProvider[] {
  const real = channel === 'telegram' ? new TelegramProvider(env) : new WhatsAppProvider(env);
  return [real, new SimulatedProvider(channel)];
}

/** Pick the first available provider for the channel (simulated is always last and always available). */
export function selectMessagingProvider(
  channel: MessagingProviderName,
  providers: MessagingProvider[] = defaultMessagingProviders(channel),
): MessagingProvider {
  const provider = providers.find((candidate) => candidate.isAvailable());
  if (!provider) {
    throw new Error(`No messaging provider is available for ${channel}`);
  }
  return provider;
}
