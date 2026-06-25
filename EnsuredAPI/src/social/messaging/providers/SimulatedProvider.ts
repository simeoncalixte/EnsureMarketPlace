import { MessagingProviderName } from '../../../db/models/social.models';
import { MessagingProvider, OutboundMessage, SendResult } from './MessagingProvider';

export interface SimulatedOutboxEntry extends OutboundMessage {
  channel: MessagingProviderName;
  externalMessageId: string;
  sentAt: Date;
}

const MAX_OUTBOX = 200;
const outbox: SimulatedOutboxEntry[] = [];
let counter = 0;

/**
 * Stand-in for a real external channel when no credentials are configured —
 * the same role the simulated Stripe/OAuth fallbacks play elsewhere. Sends
 * land in an in-memory outbox so tests and the dev UI can observe the full
 * round trip without any external account.
 */
export class SimulatedProvider implements MessagingProvider {
  readonly name = 'simulated' as const;

  constructor(readonly channel: MessagingProviderName) {}

  isAvailable(): boolean {
    return true;
  }

  async sendMessage(message: OutboundMessage): Promise<SendResult> {
    const externalMessageId = `sim-${this.channel}-${++counter}`;
    outbox.push({ ...message, channel: this.channel, externalMessageId, sentAt: new Date() });
    if (outbox.length > MAX_OUTBOX) outbox.splice(0, outbox.length - MAX_OUTBOX);
    return { ok: true, externalMessageId };
  }
}

export function getSimulatedOutbox(): readonly SimulatedOutboxEntry[] {
  return outbox;
}

export function clearSimulatedOutbox(): void {
  outbox.length = 0;
  counter = 0;
}
