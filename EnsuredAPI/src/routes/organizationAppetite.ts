import { FastifyPluginAsync } from 'fastify';
import { OrganizationAppetiteService } from '../services/OrganizationAppetiteService';
import { RuleValidationError } from '../pipeline/validation/ruleSchema';

const service = new OrganizationAppetiteService();

function userIdFrom(req: any): number | null {
  const id = req?.user?.id ?? req?.user?.userId;
  return id ? Number(id) : null;
}

function sendRuleError(reply: any, err: unknown): unknown {
  if (err instanceof RuleValidationError) {
    return reply.code(400).send({ error: 'invalid_rule', issues: err.issues });
  }
  throw err;
}

export const organizationAppetiteRoute: FastifyPluginAsync = async (app) => {
  app.get('/organizations/:id/appetite', async (request, reply) => {
    const organizationId = Number((request.params as any).id);
    const profile = await service.getProfile(organizationId, userIdFrom(request));
    return reply.send(profile);
  });

  app.put('/organizations/:id/appetite', async (request, reply) => {
    const organizationId = Number((request.params as any).id);
    const updated = await service.upsertProfile(organizationId, (request.body as any) ?? {}, userIdFrom(request));
    return reply.send(updated);
  });

  app.get('/organizations/:id/appetite/rules', async (request, reply) => {
    const organizationId = Number((request.params as any).id);
    const rules = await service.listRules(organizationId);
    return reply.send(rules);
  });

  app.post('/organizations/:id/appetite/rules', async (request, reply) => {
    const organizationId = Number((request.params as any).id);
    try {
      const created = await service.createRule(organizationId, (request.body as any) ?? {});
      return reply.code(201).send(created);
    } catch (err) {
      return sendRuleError(reply, err);
    }
  });

  app.put('/organizations/:id/appetite/rules/:ruleId', async (request, reply) => {
    const organizationId = Number((request.params as any).id);
    const ruleId = Number((request.params as any).ruleId);
    try {
      const updated = await service.updateRule(organizationId, ruleId, (request.body as any) ?? {});
      if (!updated) return reply.code(404).send({ error: 'not_found' });
      return reply.send(updated);
    } catch (err) {
      return sendRuleError(reply, err);
    }
  });

  app.delete('/organizations/:id/appetite/rules/:ruleId', async (request, reply) => {
    const organizationId = Number((request.params as any).id);
    const ruleId = Number((request.params as any).ruleId);
    const ok = await service.deleteRule(organizationId, ruleId);
    if (!ok) return reply.code(404).send({ error: 'not_found' });
    return reply.code(204).send();
  });
};

export default organizationAppetiteRoute;
