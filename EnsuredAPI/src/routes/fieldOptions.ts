import { FastifyPluginAsync } from 'fastify';
import { FieldOptionsService } from '../services/FieldOptionsService';
import { DepartmentService } from '../services/DepartmentService';
import { partnerService } from '../services/PartnerService';
import { Team, User, Peril } from '../db/models';

const optionsService = new FieldOptionsService();
const departments = new DepartmentService();

const orgId = (req: any): number => Number(req.params.id);
const body = (req: any): Record<string, unknown> => (req.body as Record<string, unknown>) ?? {};

function userLabel(u: User): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || u.email || `User ${u.id}`;
}

/**
 * Unified field-options API. One vocabulary the UI's <DynamicSelect> speaks for
 * every dynamic dropdown:
 *   - option sets  → tenant-overridable picklists (global default + tenant overlay)
 *   - entities     → live org-scoped reference rows (department / team / user)
 * Org-scoped via the path; entity writes (dept/team CRUD) reuse the departments API.
 */
export const fieldOptionsRoute: FastifyPluginAsync = async (app) => {
  // ── Option sets (tenant-overridable picklists) ──
  app.get('/organizations/:id/field-options/option-set/:key', async (req, reply) =>
    reply.send(await optionsService.resolve(orgId(req), String((req.params as any).key))),
  );

  app.post('/organizations/:id/field-options/option-set/:key/items', async (req, reply) => {
    const b = body(req);
    const label = typeof b.label === 'string' ? b.label.trim() : '';
    if (!label) return reply.code(400).send({ error: 'label_required' });
    const value = typeof b.value === 'string' ? b.value : undefined;
    return reply.send(await optionsService.addItem(orgId(req), String((req.params as any).key), label, value));
  });

  app.delete('/organizations/:id/field-options/option-set/:key/items/:value', async (req, reply) =>
    reply.send(
      await optionsService.removeItem(
        orgId(req),
        String((req.params as any).key),
        decodeURIComponent(String((req.params as any).value)),
      ),
    ),
  );

  // ── Entities (live reference data → {value:id, label}) ──
  app.get('/organizations/:id/field-options/entity/:entity', async (req, reply) => {
    const entity = String((req.params as any).entity);
    const org = orgId(req);
    const query = (req.query as Record<string, unknown>) ?? {};

    if (entity === 'department') {
      const rows = await departments.listDepartments(org);
      return reply.send({ items: rows.filter((d) => d.isActive !== false).map((d) => ({ value: d.id, label: d.name })) });
    }

    if (entity === 'team') {
      const raw = query.departmentId;
      const deptId = raw != null && raw !== '' ? Number(raw) : null;
      let rows: Team[];
      if (deptId != null && Number.isFinite(deptId)) {
        rows = (await departments.listTeams(org, deptId)) ?? [];
      } else {
        // No parent chosen → every team in the org.
        rows = await Team.findAll({ where: { organizationId: org }, order: [['name', 'ASC']] });
      }
      return reply.send({ items: rows.filter((t) => t.isActive !== false).map((t) => ({ value: t.id, label: t.name })) });
    }

    if (entity === 'user') {
      const rows = await departments.listMembers(org);
      return reply.send({ items: rows.filter((u) => u.isActive !== false).map((u) => ({ value: u.id, label: userLabel(u) })) });
    }

    if (entity === 'partner') {
      // Combined partner orgs + users (string `org:<id>` / `user:<id>` values).
      const items = await partnerService.list(org);
      return reply.send({ items: items.map((p) => ({ value: p.value, label: p.label })) });
    }

    if (entity === 'peril') {
      // Global peril taxonomy (system-wide, not org-scoped).
      const rows = await Peril.findAll({ where: { isActive: true }, order: [['sortOrder', 'ASC'], ['label', 'ASC']] });
      return reply.send({ items: rows.map((p) => ({ value: p.code, label: p.label })) });
    }

    return reply.code(400).send({ error: 'unknown_entity', entity });
  });
};

export default fieldOptionsRoute;
