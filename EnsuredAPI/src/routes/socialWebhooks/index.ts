import { FastifyPluginAsync } from 'fastify';
import { handleInboundMessage } from '../../services/social/messaging/inbound';

/**
 * Inbound webhooks from external messaging providers. These carry no Bearer
 * token — authenticity comes from a shared secret embedded in the path (and,
 * for Telegram, echoed in the X-Telegram-Bot-Api-Secret-Token header).
 * Handlers always return 200 fast: providers retry aggressively on errors and
 * we must never let a malformed update build a retry storm. Failures are logged.
 * See ./README.md for the concern map.
 */
export const socialWebhooksRoutes: FastifyPluginAsync = async (app) => {
  app.post<{
    Params: { webhookSecret: string };
    Body: {
      update_id?: number;
      message?: {
        message_id?: number;
        text?: string;
        chat?: { id?: number | string; username?: string };
        from?: { username?: string };
      };
    };
  }>('/social/webhooks/telegram/:webhookSecret', async (request, reply) => {
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
    const headerSecret = request.headers['x-telegram-bot-api-secret-token'];
    if (!expected || request.params.webhookSecret !== expected || (headerSecret && headerSecret !== expected)) {
      return reply.code(401).send({ ok: false, error: 'invalid_webhook_secret' });
    }

    const message = request.body?.message;
    const chatId = message?.chat?.id;
    const text = message?.text;
    if (chatId == null || !text || message?.message_id == null) {
      return reply.send({ ok: true }); // Non-text updates (joins, edits, …) are ignored.
    }

    const outcome = await handleInboundMessage({
      provider: 'telegram',
      externalSender: String(chatId),
      externalMessageId: `tg-${chatId}-${message.message_id}`,
      text,
      externalUsername: message.from?.username ?? message.chat?.username,
    });
    if (!outcome.ok) request.log.warn({ outcome }, 'telegram inbound message not routed');
    return reply.send({ ok: true });
  });

  app.post<{
    Params: { webhookSecret: string };
    Body: { MessageSid?: string; From?: string; Body?: string };
  }>(
    '/social/webhooks/whatsapp/:webhookSecret',
    async (request, reply) => {
      const expected = process.env.SOCIAL_WEBHOOK_SECRET;
      if (!expected || request.params.webhookSecret !== expected) {
        return reply.code(401).send({ ok: false, error: 'invalid_webhook_secret' });
      }

      const { MessageSid, From, Body } = request.body ?? {};
      if (!MessageSid || !From || !Body) return reply.send({ ok: true });

      const outcome = await handleInboundMessage({
        provider: 'whatsapp',
        externalSender: From.replace(/^whatsapp:/, ''),
        externalMessageId: MessageSid,
        text: Body,
      });
      if (!outcome.ok) request.log.warn({ outcome }, 'whatsapp inbound message not routed');
      return reply.send({ ok: true });
    },
  );

  // Dev-only stand-in for the real webhooks so the whole inbound flow —
  // verification handshake included — works with the simulated provider.
  if (process.env.NODE_ENV !== 'production') {
    app.post<{
      Body: { provider?: 'whatsapp' | 'telegram'; externalSender?: string; externalMessageId?: string; text?: string };
    }>('/social/webhooks/simulated', async (request, reply) => {
      const { provider, externalSender, externalMessageId, text } = request.body ?? {};
      if ((provider !== 'whatsapp' && provider !== 'telegram') || !externalSender || !text) {
        return reply.code(400).send({ ok: false, error: 'invalid_payload' });
      }
      const outcome = await handleInboundMessage({
        provider,
        externalSender,
        externalMessageId: externalMessageId ?? `sim-in-${Date.now()}`,
        text,
      });
      return reply.send(outcome);
    });
  }
};
