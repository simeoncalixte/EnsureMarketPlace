import { MessagingProvider, OutboundMessage, SendResult } from './MessagingProvider';

/**
 * WhatsApp adapter via the Twilio Messages API (plain fetch + basic auth — no
 * SDK dependency). Active when all three env vars are set:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM (e.g. "whatsapp:+14155238886")
 *
 * Inbound webhook (Twilio console → Messaging → webhook URL):
 *   https://<host>/api/social/webhooks/whatsapp/$SOCIAL_WEBHOOK_SECRET
 */
export class WhatsAppProvider implements MessagingProvider {
  readonly name = 'whatsapp' as const;
  readonly channel = 'whatsapp' as const;

  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  isAvailable(): boolean {
    return Boolean(this.env.TWILIO_ACCOUNT_SID && this.env.TWILIO_AUTH_TOKEN && this.env.TWILIO_WHATSAPP_FROM);
  }

  async sendMessage(message: OutboundMessage): Promise<SendResult> {
    const sid = this.env.TWILIO_ACCOUNT_SID;
    const auth = Buffer.from(`${sid}:${this.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const to = message.destination.startsWith('whatsapp:') ? message.destination : `whatsapp:${message.destination}`;
    try {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: String(this.env.TWILIO_WHATSAPP_FROM),
          To: to,
          Body: message.text,
        }).toString(),
      });
      const payload = (await response.json()) as { sid?: string; message?: string };
      if (!response.ok || !payload.sid) {
        return { ok: false, error: payload.message ?? `twilio_http_${response.status}` };
      }
      return { ok: true, externalMessageId: payload.sid };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'whatsapp_send_failed' };
    }
  }
}
