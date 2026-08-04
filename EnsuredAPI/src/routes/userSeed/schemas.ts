/** Fastify JSON schema for `POST /seed/users`. */
export const seedUsersSchema = {
  description:
    'Seed the users table with one user per role (investor, insurer, admin, analyst) plus extra investor users. ' +
    'Requires organizations to exist — call POST /seed/organizations first, or pass an orgIdMap in the request body.',
  body: {
    type: 'object',
    properties: {
      orgIdMap: {
        type: 'object',
        description:
          'Map of symbolic org keys to organization ids. ' +
          'If omitted the route will look up organizations by type automatically.',
        additionalProperties: { type: 'integer' },
      },
      extraInvestors: {
        type: 'integer',
        minimum: 0,
        default: 2,
        description: 'Number of additional random investor users to create',
      },
    },
  },
  response: {
    201: {
      description: 'Seeded users',
      type: 'object',
      properties: {
        count: { type: 'integer' },
        users: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id:             { type: 'integer' },
              email:          { type: 'string' },
              role:           { type: 'string' },
              firstName:      { type: 'string' },
              lastName:       { type: 'string' },
              organizationId: { type: ['integer', 'null'] },
              isActive:       { type: 'boolean' },
              createdAt:      { type: 'string' },
              updatedAt:      { type: 'string' },
            },
          },
        },
      },
    },
    422: {
      description: 'No organizations found — seed organizations first',
      type: 'object',
      properties: {
        error: { type: 'string' },
      },
    },
  },
} as const;
