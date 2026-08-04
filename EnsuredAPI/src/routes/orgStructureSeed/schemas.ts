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

/** Fastify JSON schema for `POST /seed/org-structure`. */
export const seedOrgStructureSchema = {
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
} as const;
