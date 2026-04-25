import { FastifyPluginAsync } from 'fastify';
import { ReinsuranceSeedOptions, ReinsuranceSeedService } from '../services/ReinsuranceSeedService';

const service = new ReinsuranceSeedService();

export const reinsuranceSeedRoute: FastifyPluginAsync = async (app) => {
  app.post(
    '/seed/reinsurance',
    {
      schema: {
        description: 'Seed an end-to-end reinsurance package flow (identity, policies/exposures, SPV, tranches, commitments, claims).',
        body: {
          type: 'object',
          properties: {
            investorCount: { type: 'integer', minimum: 2, maximum: 50, default: 3 },
            policyCount: { type: 'integer', minimum: 1, maximum: 200, default: 8 },
            exposuresPerPolicy: { type: 'integer', minimum: 1, maximum: 50, default: 2 },
            tranchesPerDeal: { type: 'integer', minimum: 1, maximum: 10, default: 3 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const options = (request.body ?? {}) as ReinsuranceSeedOptions;
      const summary = await service.seedAll(options);
      return reply.code(201).send(summary);
    },
  );
};
