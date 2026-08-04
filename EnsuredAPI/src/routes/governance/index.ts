import { FastifyPluginAsync } from 'fastify';
import { CapacityGovernanceService } from '../../services/CapacityGovernanceService';
import { RuleValidationError } from '../../services/pipeline/validation/ruleSchema';
import { LocationCapacityService } from '../../services/pipeline/capacity/locationUtilizationService';
import { loadOptionSet } from '../../services/pipeline/schemaGeneration/service';
import { buildModelFieldCatalog } from '../../services/modelFieldCatalog';
import { resolveOrganizationIdFromRequest } from '../../services/lib/org';

const service = new CapacityGovernanceService();
const capacityService = new LocationCapacityService();

function sendRuleError(reply: any, err: unknown): unknown {
  if (err instanceof RuleValidationError) {
    return reply.code(400).send({ error: 'invalid_rule', issues: err.issues });
  }
  throw err;
}

function userIdFrom(req: any): number | null {
  const id = req?.user?.id ?? req?.user?.userId;
  return id ? Number(id) : null;
}

const orgId = (req: any): number => Number(req.params.id);
const numParam = (req: any, key: string): number => Number(req.params[key]);
const body = (req: any): Record<string, unknown> => (req.body as Record<string, unknown>) ?? {};

/**
 * Governance / Capacity Configuration API. All routes are organization-scoped
 * and registered under the `/api` prefix (see app.ts).
 */
export const governanceRoute: FastifyPluginAsync = async (app) => {
  // ─── Capacity definitions (spine) ──
  app.get('/organizations/:id/governance/capacity-definitions', async (req, reply) =>
    reply.send(await service.listDefinitions(orgId(req))),
  );

  app.post('/organizations/:id/governance/capacity-definitions', async (req, reply) => {
    const created = await service.createDefinition(orgId(req), body(req), userIdFrom(req));
    return reply.code(201).send(created);
  });

  app.get('/organizations/:id/governance/capacity-definitions/:defId', async (req, reply) => {
    const def = await service.getDefinition(orgId(req), numParam(req, 'defId'));
    if (!def) return reply.code(404).send({ error: 'not_found' });
    return reply.send(def);
  });

  app.put('/organizations/:id/governance/capacity-definitions/:defId', async (req, reply) => {
    const updated = await service.updateDefinition(orgId(req), numParam(req, 'defId'), body(req), userIdFrom(req));
    if (!updated) return reply.code(404).send({ error: 'not_found' });
    return reply.send(updated);
  });

  app.post('/organizations/:id/governance/capacity-definitions/:defId/transition', async (req, reply) => {
    const updated = await service.transitionDefinition(orgId(req), numParam(req, 'defId'), body(req) as any, userIdFrom(req));
    if (!updated) return reply.code(404).send({ error: 'not_found' });
    return reply.send(updated);
  });

  app.post('/organizations/:id/governance/capacity-definitions/:defId/clone', async (req, reply) => {
    const clone = await service.cloneDefinition(orgId(req), numParam(req, 'defId'), userIdFrom(req));
    if (!clone) return reply.code(404).send({ error: 'not_found' });
    return reply.code(201).send(clone);
  });

  app.delete('/organizations/:id/governance/capacity-definitions/:defId', async (req, reply) => {
    const ok = await service.deleteDefinition(orgId(req), numParam(req, 'defId'));
    if (!ok) return reply.code(404).send({ error: 'not_found' });
    return reply.code(204).send();
  });

  // ─── Authority levels (Section 11) ──
  app.get('/organizations/:id/governance/capacity-definitions/:defId/authority-levels', async (req, reply) =>
    reply.send(await service.listAuthorityLevels(orgId(req), numParam(req, 'defId'))),
  );
  app.post('/organizations/:id/governance/capacity-definitions/:defId/authority-levels', async (req, reply) => {
    const row = await service.createAuthorityLevel(orgId(req), numParam(req, 'defId'), body(req));
    if (!row) return reply.code(404).send({ error: 'definition_not_found' });
    return reply.code(201).send(row);
  });
  app.put('/organizations/:id/governance/authority-levels/:rowId', async (req, reply) => {
    const row = await service.updateAuthorityLevel(orgId(req), numParam(req, 'rowId'), body(req));
    if (!row) return reply.code(404).send({ error: 'not_found' });
    return reply.send(row);
  });
  app.delete('/organizations/:id/governance/authority-levels/:rowId', async (req, reply) => {
    const ok = await service.deleteAuthorityLevel(orgId(req), numParam(req, 'rowId'));
    if (!ok) return reply.code(404).send({ error: 'not_found' });
    return reply.code(204).send();
  });

  // ─── Referral rules (Section 14) ──
  app.get('/organizations/:id/governance/capacity-definitions/:defId/referral-rules', async (req, reply) =>
    reply.send(await service.listReferralRules(orgId(req), numParam(req, 'defId'))),
  );
  app.post('/organizations/:id/governance/capacity-definitions/:defId/referral-rules', async (req, reply) => {
    const row = await service.createReferralRule(orgId(req), numParam(req, 'defId'), body(req));
    if (!row) return reply.code(404).send({ error: 'definition_not_found' });
    return reply.code(201).send(row);
  });
  app.put('/organizations/:id/governance/referral-rules/:rowId', async (req, reply) => {
    const row = await service.updateReferralRule(orgId(req), numParam(req, 'rowId'), body(req));
    if (!row) return reply.code(404).send({ error: 'not_found' });
    return reply.send(row);
  });
  app.delete('/organizations/:id/governance/referral-rules/:rowId', async (req, reply) => {
    const ok = await service.deleteReferralRule(orgId(req), numParam(req, 'rowId'));
    if (!ok) return reply.code(404).send({ error: 'not_found' });
    return reply.code(204).send();
  });

  // ─── Model field catalog — dot-notation paths over the real DB models ──
  // User- and organization-aware: the organization is resolved from the caller's
  // token (not just the path), and a mismatch is rejected so a rule can only be
  // built against data points that belong to the requesting organization.
  app.get('/organizations/:id/governance/model-catalog', async (req, reply) => {
    const pathOrg = orgId(req);
    const tokenOrg = await resolveOrganizationIdFromRequest(req);
    if (tokenOrg != null && tokenOrg !== pathOrg) {
      return reply.code(403).send({ error: 'org_mismatch' });
    }
    return reply.send(buildModelFieldCatalog(tokenOrg ?? pathOrg));
  });

  // ─── Rules-engine rule sets (Section 15) ──
  app.get('/organizations/:id/governance/capacity-definitions/:defId/rule-sets', async (req, reply) =>
    reply.send(await service.listRuleSets(orgId(req), numParam(req, 'defId'))),
  );
  app.post('/organizations/:id/governance/capacity-definitions/:defId/rule-sets', async (req, reply) => {
    const row = await service.createRuleSet(orgId(req), numParam(req, 'defId'), body(req));
    if (!row) return reply.code(404).send({ error: 'definition_not_found' });
    return reply.code(201).send(row);
  });
  app.put('/organizations/:id/governance/rule-sets/:rowId', async (req, reply) => {
    const row = await service.updateRuleSet(orgId(req), numParam(req, 'rowId'), body(req));
    if (!row) return reply.code(404).send({ error: 'not_found' });
    return reply.send(row);
  });
  app.delete('/organizations/:id/governance/rule-sets/:rowId', async (req, reply) => {
    const ok = await service.deleteRuleSet(orgId(req), numParam(req, 'rowId'));
    if (!ok) return reply.code(404).send({ error: 'not_found' });
    return reply.code(204).send();
  });
  // Execute a rule against one subject record. User/org-aware; defaults to a dry
  // run, and only commits CRUD/calculations when `dryRun: false` is passed.
  app.post('/organizations/:id/governance/rule-sets/:rowId/run', async (req, reply) => {
    const pathOrg = orgId(req);
    const tokenOrg = await resolveOrganizationIdFromRequest(req);
    if (tokenOrg != null && tokenOrg !== pathOrg) {
      return reply.code(403).send({ error: 'org_mismatch' });
    }
    const b = body(req);
    const subjectId = Number(b.subjectId);
    if (!Number.isFinite(subjectId)) return reply.code(400).send({ error: 'subjectId_required' });
    const result = await service.runRuleSet(tokenOrg ?? pathOrg, numParam(req, 'rowId'), subjectId, {
      dryRun: b.dryRun !== false,
    });
    if (!result) return reply.code(404).send({ error: 'not_found' });
    return reply.send(result);
  });

  // ─── Simulations (Section 18) ──
  app.get('/organizations/:id/governance/simulations', async (req, reply) =>
    reply.send(await service.listSimulations(orgId(req))),
  );
  app.post('/organizations/:id/governance/simulations', async (req, reply) => {
    const sim = await service.runSimulation(orgId(req), body(req), userIdFrom(req));
    return reply.code(201).send(sim);
  });
  app.delete('/organizations/:id/governance/simulations/:simId', async (req, reply) => {
    const ok = await service.deleteSimulation(orgId(req), numParam(req, 'simId'));
    if (!ok) return reply.code(404).send({ error: 'not_found' });
    return reply.code(204).send();
  });

  // ─── Audit trail (Section 17) ──
  app.get('/organizations/:id/governance/audit', async (req, reply) => {
    const defId = (req.query as any)?.definitionId;
    return reply.send(await service.listAudit(orgId(req), defId ? Number(defId) : undefined));
  });

  // ─── Appetite validation rules (flat, enforced by the validation pipeline) ──
  app.get('/organizations/:id/governance/capacity-definitions/:defId/validation-rules', async (req, reply) =>
    reply.send(await service.listValidationRules(orgId(req), numParam(req, 'defId'))),
  );
  app.post('/organizations/:id/governance/capacity-definitions/:defId/validation-rules', async (req, reply) => {
    try {
      const row = await service.createValidationRule(orgId(req), numParam(req, 'defId'), body(req));
      if (!row) return reply.code(404).send({ error: 'definition_not_found' });
      return reply.code(201).send(row);
    } catch (err) {
      return sendRuleError(reply, err);
    }
  });
  app.put('/organizations/:id/governance/validation-rules/:rowId', async (req, reply) => {
    try {
      const row = await service.updateValidationRule(orgId(req), numParam(req, 'rowId'), body(req));
      if (!row) return reply.code(404).send({ error: 'not_found' });
      return reply.send(row);
    } catch (err) {
      return sendRuleError(reply, err);
    }
  });
  app.delete('/organizations/:id/governance/validation-rules/:rowId', async (req, reply) => {
    const ok = await service.deleteValidationRule(orgId(req), numParam(req, 'rowId'));
    if (!ok) return reply.code(404).send({ error: 'not_found' });
    return reply.code(204).send();
  });

  // ─── Per-location limits (LOB × location) + capacity utilization layer ──
  app.get('/organizations/:id/governance/capacity-definitions/:defId/location-limits', async (req, reply) =>
    reply.send(await service.listLocationLimits(orgId(req), numParam(req, 'defId'))),
  );
  app.put('/organizations/:id/governance/capacity-definitions/:defId/location-limits', async (req, reply) => {
    const b = body(req);
    if (!b.entry || !String(b.entry).trim()) {
      return reply.code(400).send({ error: 'entry_required' });
    }
    try {
      const saved = await service.upsertLocationLimit(orgId(req), numParam(req, 'defId'), b, userIdFrom(req));
      return reply.send(saved ?? { deleted: true });
    } catch (err) {
      if (err instanceof Error && err.message === 'invalid_entry') {
        return reply.code(400).send({ error: 'invalid_entry' });
      }
      throw err;
    }
  });
  app.delete('/organizations/:id/governance/location-limits/:limitId', async (req, reply) => {
    const ok = await service.deleteLocationLimit(orgId(req), numParam(req, 'limitId'));
    if (!ok) return reply.code(404).send({ error: 'not_found' });
    return reply.code(204).send();
  });
  app.get('/organizations/:id/governance/capacity-layer', async (req, reply) => {
    const lob = (req.query as any)?.lob;
    const layer = await capacityService.computeUtilization(orgId(req), {
      lineOfBusinessCode: lob ? String(lob) : undefined,
    });
    return reply.send(layer);
  });

  // ─── Option sets — every Governance list is seeded, never hardcoded ──
  app.get('/organizations/:id/governance/option-sets/:key', async (req, reply) => {
    const key = String((req.params as any).key);
    // Prefer a per-org override, fall back to the global (org-null) seeded set.
    const set = (await loadOptionSet(key, orgId(req))) ?? (await loadOptionSet(key, null));
    if (!set) return reply.code(404).send({ error: 'no_option_set', key });
    return reply.send(set);
  });
};

export default governanceRoute;
