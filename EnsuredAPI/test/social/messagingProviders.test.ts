import { SimulatedProvider, clearSimulatedOutbox, getSimulatedOutbox } from '../../src/social/messaging/providers/SimulatedProvider';
import { TelegramProvider } from '../../src/social/messaging/providers/TelegramProvider';
import { WhatsAppProvider } from '../../src/social/messaging/providers/WhatsAppProvider';
import {
  defaultMessagingProviders,
  selectMessagingProvider,
} from '../../src/social/messaging/providers/selectMessagingProvider';

describe('selectMessagingProvider', () => {
  it('falls back to the simulated provider when no credentials are configured', () => {
    const provider = selectMessagingProvider('telegram', defaultMessagingProviders('telegram', {}));
    expect(provider.name).toBe('simulated');
    expect(provider.channel).toBe('telegram');
  });

  it('selects the real Telegram provider when its env vars exist', () => {
    const env = { TELEGRAM_BOT_TOKEN: 't', TELEGRAM_WEBHOOK_SECRET: 's' } as NodeJS.ProcessEnv;
    const provider = selectMessagingProvider('telegram', defaultMessagingProviders('telegram', env));
    expect(provider).toBeInstanceOf(TelegramProvider);
  });

  it('selects the real WhatsApp provider when Twilio env vars exist', () => {
    const env = {
      TWILIO_ACCOUNT_SID: 'AC1',
      TWILIO_AUTH_TOKEN: 'tok',
      TWILIO_WHATSAPP_FROM: 'whatsapp:+10000000000',
    } as NodeJS.ProcessEnv;
    const provider = selectMessagingProvider('whatsapp', defaultMessagingProviders('whatsapp', env));
    expect(provider).toBeInstanceOf(WhatsAppProvider);
  });

  it('partial credentials still fall back to simulated', () => {
    const env = { TELEGRAM_BOT_TOKEN: 't' } as NodeJS.ProcessEnv;
    const provider = selectMessagingProvider('telegram', defaultMessagingProviders('telegram', env));
    expect(provider.name).toBe('simulated');
  });
});

describe('SimulatedProvider outbox', () => {
  beforeEach(() => clearSimulatedOutbox());

  it('records sends with unique external ids', async () => {
    const provider = new SimulatedProvider('whatsapp');
    const first = await provider.sendMessage({ destination: '+15551234567', text: 'hello' });
    const second = await provider.sendMessage({ destination: '+15551234567', text: 'again' });
    expect(first.ok && second.ok).toBe(true);
    const outbox = getSimulatedOutbox();
    expect(outbox).toHaveLength(2);
    expect(outbox[0].text).toBe('hello');
    expect(new Set(outbox.map((entry) => entry.externalMessageId)).size).toBe(2);
  });
});
