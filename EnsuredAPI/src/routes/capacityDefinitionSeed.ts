import { FastifyPluginAsync } from 'fastify';
import { Organization } from '../db/models/identity.models';
import { CapacityDefinitionSeedService } from '../services/CapacityDefinitionSeedService';

const service = new CapacityDefinitionSeedService();

/**
 * Seeds a fully-populated, ACTIVE CapacityDefinition per organization (matching
 * the Capacity editor 1:1 and carrying the authoritative enforcement appetite
 * block) so the ingestion/validation pipeline can be tested for adherence to
 * each organization's rules. Registered under the `/api` prefix (see app.ts).
 */
export const capacityDefinitionSeedRoute: FastifyPluginAsync = async (app) => {
  app.post(
    '/seed/capacity-definitions',
    {
      schema: {
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
      },
    },
    async (request, reply) => {
      const { organizationId, archetype, overwrite = true } = (request.body ?? {}) as {
        organizationId?: number;
        archetype?: string;
        overwrite?: boolean;
      };

      const anyOrg = await Organization.findOne();
      if (!anyOrg) {
        return reply
          .code(422)
          .send({ error: 'No organizations found. Call POST /seed/organizations first.' });
      }

      try {
        const result = await service.seed({ organizationId, archetype, overwrite });
        const created = result.outcomes.filter((o) => o.action === 'created').length;
        const updated = result.outcomes.filter((o) => o.action === 'updated').length;
        const skipped = result.outcomes.filter((o) => o.action === 'skipped').length;
        return reply.code(201).send({
          count: result.count,
          message: `Applied ${result.count} capacity definition(s): ${created} created, ${updated} updated, ${skipped} skipped (one active per org).`,
          outcomes: result.outcomes,
        });
      } catch (err: any) {
        if (typeof err?.message === 'string' && err.message.startsWith('unknown_archetype:')) {
          return reply.code(400).send({ error: err.message });
        }
        throw err;
      }
    },
  );
};

export default capacityDefinitionSeedRoute;
