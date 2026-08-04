import { MessagingProviderName } from '../../../../db/models/social.models';

/**
 * One external messaging channel (WhatsApp, Telegram, …) behind a uniform
 * send interface. Mirrors `pipeline/connectors/geocoding/GeocodeProvider.ts`:
 * real adapters activate when their env credentials exist; otherwise the
 * simulated adapter keeps the full flow exercisable offline.
 */

export interface OutboundMessage {
  /** Provider-specific destination from UserMessagingIntegration.configJson
   *  (telegram: chatId, whatsapp: phoneE164). */
  destination: string;
  text: string;
}

export type SendResult = { ok: true; externalMessageId: string } | { ok: false; error: string };

export interface MessagingProvider {
  readonly name: MessagingProviderName | 'simulated';
  /** Which external channel this adapter serves. */
  readonly channel: MessagingProviderName;
  isAvailable(): boolean;
  sendMessage(message: OutboundMessage): Promise<SendResult>;
}
