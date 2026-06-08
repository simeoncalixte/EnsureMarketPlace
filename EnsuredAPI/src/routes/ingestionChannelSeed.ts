import { FastifyPluginAsync } from 'fastify';
import { ChannelSeedService } from '../services/ChannelSeedService';

const service = new ChannelSeedService();

export const ingestionChannelSeedRoute: FastifyPluginAsync = async (app) => {
  app.post(
    '/seed/ingestion-channels',
    {
      schema: {
        description: 'Seed ingestion channels (one per current channel config) and the submissions each produced for the insurer organization.',
        response: {
          201: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (request, reply) => {
      const summary = await service.seed();
      return reply.code(201).send(summary);
    },
  );
};

export default ingestionChannelSeedRoute;
