import { FastifyReply, FastifyRequest } from 'fastify';
import {
  OrgStructureSeedError,
  OrgStructureSeedService,
} from '../../services/OrgStructureSeedService';

const service = new OrgStructureSeedService();

export async function seedOrgStructureHandler(request: FastifyRequest, reply: FastifyReply) {
  const {
    organizationId,
    extraMembers = 3,
    backfillExisting = true,
    adoptOrphans = true,
  } = (request.body ?? {}) as {
    organizationId?: number;
    extraMembers?: number;
    backfillExisting?: boolean;
    adoptOrphans?: boolean;
  };

  try {
    // No organizationId → seed every organization so users in ALL orgs (not
    // just the first one) land in their own org's departments/teams.
    if (!organizationId) {
      const results = await service.seedAll({ extraMembers, backfillExisting });
      const sum = (pick: (r: (typeof results)[number]) => number) =>
        results.reduce((total, r) => total + pick(r), 0);

      return reply.code(201).send({
        organizationId: results[0].organizationId,
        organizationCount: results.length,
        departmentCount: sum((r) => r.departments.length),
        teamCount: sum((r) => r.teams.length),
        memberCount: sum((r) => r.members.length),
        backfilledCount: sum((r) => r.backfilled.length),
        message:
          `Seeded ${results.length} organization(s) with their own departments, teams, and ` +
          `members; every user is assigned to a department/team within its own organization.`,
        members: results.flatMap((r) => r.members),
        backfilled: results.flatMap((r) => r.backfilled),
        perOrganization: results.map((r) => ({
          organizationId: r.organizationId,
          departmentCount: r.departments.length,
          teamCount: r.teams.length,
          memberCount: r.members.length,
          backfilledCount: r.backfilled.length,
        })),
      });
    }

    const result = await service.seed(organizationId, {
      extraMembers,
      backfillExisting,
      adoptOrphans,
    });
    return reply.code(201).send({
      organizationId: result.organizationId,
      organizationCount: 1,
      departmentCount: result.departments.length,
      teamCount: result.teams.length,
      memberCount: result.members.length,
      backfilledCount: result.backfilled.length,
      message:
        `Seeded ${result.departments.length} department(s), ${result.teams.length} team(s), ` +
        `${result.members.length} new member(s); backfilled ${result.backfilled.length} existing user(s) ` +
        `with an organization, department, and team.`,
      members: result.members,
      backfilled: result.backfilled,
      perOrganization: [
        {
          organizationId: result.organizationId,
          departmentCount: result.departments.length,
          teamCount: result.teams.length,
          memberCount: result.members.length,
          backfilledCount: result.backfilled.length,
        },
      ],
    });
  } catch (err) {
    if (err instanceof OrgStructureSeedError) {
      return reply.code(422).send({ error: err.code });
    }
    throw err;
  }
}
