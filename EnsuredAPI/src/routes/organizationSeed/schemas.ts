/** Fastify JSON schema for `POST /seed/organizations`. */
export const seedOrganizationsSchema = {
  description: 'Seed the organizations table with one organization per type plus extra investor funds',
  querystring: {
    type: 'object',
    properties: {
      extras: { type: 'integer', minimum: 0, default: 2, description: 'Number of additional investor_fund organizations to create' },
    },
  },
  response: {
    201: {
      description: 'Seeded organizations',
      type: 'object',
      properties: {
        count: { type: 'integer' },
        organizations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id:        { type: 'integer' },
              name:      { type: 'string' },
              type:      { type: 'string' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
  },
} as const;
