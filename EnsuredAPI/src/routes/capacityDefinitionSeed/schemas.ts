/** Fastify JSON schema for `POST /seed/capacity-definitions`. */
export const seedCapacityDefinitionsSchema = {
  description:
    'Seed one active CapacityDefinition per organization, populated 1:1 with the capacity editor ' +
    'sections plus the enforcement appetite block. Archetypes are assigned round-robin so the org ' +
    'set spans distinct rule sets. Requires organizations to exist (POST /seed/organizations first).',
  body: {
    type: 'object',
    properties: {
      organizationId: {
        type: 'integer',
        description: 'Seed only this organization. Defaults to every organization.',
      },
      archetype: {
        type: 'string',
        description:
          'Force one blueprint for every org: property_cat_na | commercial_casualty | specialty_conservative.',
      },
      overwrite: {
        type: 'boolean',
        default: true,
        description: 'Refresh a definition that already carries the seed code instead of skipping it.',
      },
    },
  },
  response: {
    201: {
      description: 'Seeded capacity definitions',
      type: 'object',
      properties: {
        count: { type: 'integer' },
        message: { type: 'string' },
        outcomes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              organizationId: { type: 'integer' },
              organizationName: { type: 'string' },
              archetype: { type: 'string' },
              code: { type: 'string' },
              capacityDefinitionId: { type: ['integer', 'null'] },
              action: { type: 'string' },
            },
          },
        },
      },
    },
    422: {
      description: 'No organizations found — seed organizations first',
      type: 'object',
      properties: { error: { type: 'string' } },
    },
  },
} as const;
