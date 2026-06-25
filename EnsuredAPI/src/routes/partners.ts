import { FastifyPluginAsync } from 'fastify';
import { partnerService, PartnerKind } from '../services/PartnerService';

const orgId = (req: any): number => Number(req.params.id);

/**
 * Distribution-partner writes. Reads go through the unified field-options entity
 * API (`/field-options/entity/partner`); these handle creating a partner stub
 * (org or user, with default info), removing one, and claiming by token.
 */
export const partnersRoute: FastifyPluginAsync = async (app) => {
  // List (mirrors the field-options read; handy for the manager UI).
  app.get('/organizations/:id/partners', async (req, reply) =>
    reply.send({ items: await partnerService.list(orgId(req)) }),
  );

  // Create a partner stub with default info.
  app.post('/organizations/:id/partners', async (req, reply) => {
    const b = (req.body as Record<string, unknown>) ?? {};
    const kind = b.kind === 'organization' || b.kind === 'user' ? (b.kind as PartnerKind) : null;
    const name = typeof b.name === 'string' ? b.name.trim() : '';
    const email = typeof b.email === 'string' ? b.email.trim() : undefined;
    if (!kind) return reply.code(400).send({ error: 'kind_required', detail: 'kind must be "organization" or "user"' });
    if (!name) return reply.code(400).send({ error: 'name_required' });
    try {
      const item = await partnerService.create(orgId(req), { kind, name, email });
      return reply.code(201).send(item);
    } catch (e: any) {
      return reply.code(400).send({ error: 'create_failed', detail: e?.message });
    }
  });

  // Remove a partner stub (value is `org:<id>` or `user:<id>`, URL-encoded).
  app.delete('/organizations/:id/partners/:value', async (req, reply) => {
    const value = decodeURIComponent(String((req.params as any).value));
    try {
      await partnerService.remove(orgId(req), value);
      return reply.code(204).send();
    } catch (e: any) {
      return reply.code(400).send({ error: 'remove_failed', detail: e?.message });
    }
  });

  // Claim a partner stub by token (foundation: marks it claimed).
  app.post('/partners/claim', async (req, reply) => {
    const b = (req.body as Record<string, unknown>) ?? {};
    const token = typeof b.token === 'string' ? b.token : '';
    if (!token) return reply.code(400).send({ error: 'token_required' });
    const claimed = await partnerService.claim(token);
    if (!claimed) return reply.code(404).send({ error: 'invalid_or_used_token' });
    return reply.send({ claimed });
  });
};

export default partnersRoute;
