import { FastifyPluginAsync } from 'fastify';
import {
  OrgStructureSeedError,
  OrgStructureSeedService,
} from '../services/OrgStructureSeedService';

const service = new OrgStructureSeedService();

const userItem = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    email: { type: 'string' },
    role: { type: 'string' },
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    organizationId: { type: ['integer', 'null'] },
    departmentId: { type: ['integer', 'null'] },
    teamId: { type: ['integer', 'null'] },
    isActive: { type: 'boolean' },
  },
} as const;

/**
 * Seeds a full organizational structure (departments + teams) for one
 * organization and populates it with users, each assigned a role and placed into
 * a department/team. Registered under the `/api` prefix (see app.ts).
 */
export const orgStructureSeedRoute: FastifyPluginAsync = async (app) => {
  app.post(
    '/seed/org-structure',
    {
      schema: {
        description:
          'Seed departments, teams, and role-assigned members for an organization. ' +
          'If organizationId is omitted, EVERY organization is seeded — each gets ' +
          'its own departments/teams and its own users spread across them — so call ' +
          'POST /seed/organizations first if none exist.',
        body: {
          type: 'object',
          properties: {
            organizationId: {
              type: 'integer',
              description:
                'Target organization. Omit to seed every organization in one pass.',
            },
            extraMembers: {
              type: 'integer',
              minimum: 0,
              default: 3,
              description: 'Number of additional random members spread across teams.',
            },
            backfillExisting: {
              type: 'boolean',
              default: true,
              description:
                'Sweep pre-existing users and fill any missing organization/department/team assignment.',
            },
            adoptOrphans: {
              type: 'boolean',
              default: true,
              description:
                'When backfilling, adopt users with no organization into this one.',
            },
          },
        },
        response: {
          201: {
            description: 'Seeded organizational structure',
            type: 'object',
            properties: {
              organizationId: { type: 'integer' },
              organizationCount: { type: 'integer' },
              departmentCount: { type: 'integer' },
              teamCount: { type: 'integer' },
              memberCount: { type: 'integer' },
              backfilledCount: { type: 'integer' },
              message: { type: 'string' },
              members: { type: 'array', items: userItem },
              backfilled: { type: 'array', items: userItem },
              perOrganization: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    organizationId: { type: 'integer' },
                    departmentCount: { type: 'integer' },
                    teamCount: { type: 'integer' },
                    memberCount: { type: 'integer' },
                    backfilledCount: { type: 'integer' },
                  },
                },
              },
            },
          },
          422: {
            description: 'No organization found — seed organizations first',
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (request, reply) => {
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
    },
  );
};

export default orgStructureSeedRoute;
