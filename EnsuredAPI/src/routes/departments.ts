import { FastifyPluginAsync } from 'fastify';
import { AssignmentError, DepartmentService } from '../services/DepartmentService';

const service = new DepartmentService();

const orgId = (req: any): number => Number(req.params.id);
const numParam = (req: any, key: string): number => Number(req.params[key]);
const body = (req: any): Record<string, unknown> => (req.body as Record<string, unknown>) ?? {};

function requireName(reply: any, b: Record<string, unknown>): string | null {
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  if (!name) {
    reply.code(400).send({ error: 'name_required' });
    return null;
  }
  return name;
}

/**
 * Organizational structure API — Departments, the Teams nested within them, and
 * user assignment. All routes are organization-scoped and registered under the
 * `/api` prefix (see app.ts).
 */
export const departmentsRoute: FastifyPluginAsync = async (app) => {
  // ── Departments ──
  app.get('/organizations/:id/departments', async (req, reply) =>
    reply.send(await service.listDepartments(orgId(req))),
  );

  app.post('/organizations/:id/departments', async (req, reply) => {
    const b = body(req);
    const name = requireName(reply, b);
    if (name === null) return reply;
    const created = await service.createDepartment(orgId(req), { ...b, name } as any);
    return reply.code(201).send(created);
  });

  app.get('/organizations/:id/departments/:deptId', async (req, reply) => {
    const dept = await service.getDepartment(orgId(req), numParam(req, 'deptId'));
    if (!dept) return reply.code(404).send({ error: 'not_found' });
    return reply.send(dept);
  });

  app.put('/organizations/:id/departments/:deptId', async (req, reply) => {
    const updated = await service.updateDepartment(orgId(req), numParam(req, 'deptId'), body(req) as any);
    if (!updated) return reply.code(404).send({ error: 'not_found' });
    return reply.send(updated);
  });

  app.delete('/organizations/:id/departments/:deptId', async (req, reply) => {
    const ok = await service.deleteDepartment(orgId(req), numParam(req, 'deptId'));
    if (!ok) return reply.code(404).send({ error: 'not_found' });
    return reply.code(204).send();
  });

  // ── Teams (nested under a department) ──
  app.get('/organizations/:id/departments/:deptId/teams', async (req, reply) => {
    const teams = await service.listTeams(orgId(req), numParam(req, 'deptId'));
    if (teams === null) return reply.code(404).send({ error: 'department_not_found' });
    return reply.send(teams);
  });

  app.post('/organizations/:id/departments/:deptId/teams', async (req, reply) => {
    const b = body(req);
    const name = requireName(reply, b);
    if (name === null) return reply;
    const created = await service.createTeam(orgId(req), numParam(req, 'deptId'), { ...b, name } as any);
    if (!created) return reply.code(404).send({ error: 'department_not_found' });
    return reply.code(201).send(created);
  });

  app.put('/organizations/:id/teams/:teamId', async (req, reply) => {
    const updated = await service.updateTeam(orgId(req), numParam(req, 'teamId'), body(req) as any);
    if (!updated) return reply.code(404).send({ error: 'not_found' });
    return reply.send(updated);
  });

  app.delete('/organizations/:id/teams/:teamId', async (req, reply) => {
    const ok = await service.deleteTeam(orgId(req), numParam(req, 'teamId'));
    if (!ok) return reply.code(404).send({ error: 'not_found' });
    return reply.code(204).send();
  });

  // ── Membership ──
  app.get('/organizations/:id/departments/:deptId/members', async (req, reply) =>
    reply.send(await service.listMembers(orgId(req), { departmentId: numParam(req, 'deptId') })),
  );

  app.get('/organizations/:id/teams/:teamId/members', async (req, reply) =>
    reply.send(await service.listMembers(orgId(req), { teamId: numParam(req, 'teamId') })),
  );

  // Assign (or clear) a user's department/team. Body: { departmentId?, teamId? }
  // where a field omitted leaves it unchanged and `null` clears it.
  app.put('/organizations/:id/users/:userId/assignment', async (req, reply) => {
    const b = body(req);
    try {
      const updated = await service.assignUser(orgId(req), numParam(req, 'userId'), {
        departmentId: b.departmentId as number | null | undefined,
        teamId: b.teamId as number | null | undefined,
      });
      if (!updated) return reply.code(404).send({ error: 'user_not_found' });
      return reply.send(updated);
    } catch (err) {
      if (err instanceof AssignmentError) {
        return reply.code(400).send({ error: err.code });
      }
      throw err;
    }
  });
};

export default departmentsRoute;
