import { FastifyPluginAsync } from 'fastify';
import { OrganizationService } from '../services/OrganizationService';

const service = new OrganizationService();

export const organizationSeedRoute: FastifyPluginAsync = async (app) => {
  app.post(
    '/seed/organizations',
    {
      schema: {
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
      },
    },
    async (request, reply) => {
      const { extras = 2 } = request.query as { extras?: number };
      const organizations = await service.seed(extras);
      return reply.code(201).send({ count: organizations.length, organizations });
    },
  );
};
