import { MessagingProvider, OutboundMessage, SendResult } from './MessagingProvider';

/**
 * Telegram Bot API adapter (webhook mode). Active when both env vars are set:
 *   TELEGRAM_BOT_TOKEN      — from @BotFather
 *   TELEGRAM_WEBHOOK_SECRET — shared secret embedded in the webhook path AND
 *                             sent by Telegram in X-Telegram-Bot-Api-Secret-Token
 *
 * One-time webhook registration (public URL required — e.g. ngrok in dev):
 *   curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
 *     -d "url=https://<host>/api/social/webhooks/telegram/$TELEGRAM_WEBHOOK_SECRET" \
 *     -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
 */
export class TelegramProvider implements MessagingProvider {
  readonly name = 'telegram' as const;
  readonly channel = 'telegram' as const;

  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  isAvailable(): boolean {
    return Boolean(this.env.TELEGRAM_BOT_TOKEN && this.env.TELEGRAM_WEBHOOK_SECRET);
  }

  async sendMessage(message: OutboundMessage): Promise<SendResult> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: message.destination, text: message.text }),
      });
      const payload = (await response.json()) as { ok?: boolean; result?: { message_id?: number }; description?: string };
      if (!response.ok || !payload.ok || payload.result?.message_id == null) {
        return { ok: false, error: payload.description ?? `telegram_http_${response.status}` };
      }
      return { ok: true, externalMessageId: String(payload.result.message_id) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'telegram_send_failed' };
    }
  }
}
