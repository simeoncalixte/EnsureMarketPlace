import { randomInt } from 'crypto';
import { FastifyPluginAsync } from 'fastify';
import { messagingProviders, MessagingProviderName, UserMessagingIntegration } from '../../db/models/social.models';
import { defaultMessagingProviders } from '../../services/social/messaging/providers/selectMessagingProvider';
import { resolveUser } from '../helpers/resolveUser';

/** Display-safe view: config may hold chat ids / phone numbers — show only hints. */
function redact(integration: UserMessagingIntegration) {
  const config = (integration.configJson ?? {}) as { chatId?: unknown; phoneE164?: unknown; username?: unknown };
  const phone = config.phoneE164 ? String(config.phoneE164) : null;
  const realAvailable = defaultMessagingProviders(integration.provider)[0].isAvailable();
  return {
    id: integration.id,
    provider: integration.provider,
    verified: integration.verified,
    verifiedAt: integration.verifiedAt,
    verificationCode: integration.verified ? null : integration.verificationCode,
    simulated: !realAvailable,
    display: {
      username: config.username ? String(config.username) : null,
      phoneMasked: phone ? `${phone.slice(0, 4)}•••${phone.slice(-2)}` : null,
    },
    createdAt: integration.createdAt,
  };
}

export const socialIntegrationsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/social/integrations', async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) return reply;

    const integrations = await UserMessagingIntegration.findAll({ where: { userId: user.id } });
    return reply.send({ ok: true, integrations: integrations.map(redact) });
  });

  app.post<{ Body: { provider?: string; phoneE164?: string } }>('/social/integrations', async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) return reply;

    const provider = request.body?.provider as MessagingProviderName;
    if (!messagingProviders.includes(provider)) {
      return reply.code(400).send({ ok: false, error: 'invalid_provider' });
    }

    const existing = await UserMessagingIntegration.findOne({ where: { userId: user.id, provider } });
    if (existing?.verified) {
      return reply.code(409).send({ ok: false, error: 'integration_already_verified' });
    }

    // For WhatsApp the user supplies their number up front; for Telegram the
    // chat id is learned from the verification message itself.
    const phoneE164 = (request.body?.phoneE164 ?? '').trim();
    if (provider === 'whatsapp' && !/^\+\d{7,15}$/.test(phoneE164)) {
      return reply.code(400).send({ ok: false, error: 'invalid_phone' });
    }

    const verificationCode = String(randomInt(100000, 1000000));
    const configJson = provider === 'whatsapp' ? { phoneE164 } : {};

    const integration = existing
      ? await existing.update({ configJson, verificationCode, verified: false, verifiedAt: null })
      : await UserMessagingIntegration.create({
          userId: user.id,
          provider,
          configJson,
          verificationCode,
          verified: false,
          verifiedAt: null,
        });

    return reply.code(201).send({ ok: true, integration: redact(integration) });
  });

  app.delete<{ Params: { id: string } }>('/social/integrations/:id', async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) return reply;

    const integration = await UserMessagingIntegration.findByPk(Number(request.params.id));
    if (!integration || integration.userId !== user.id) {
      return reply.code(404).send({ ok: false, error: 'integration_not_found' });
    }
    await integration.destroy();
    return reply.send({ ok: true });
  });
};
