import { FastifyPluginAsync } from 'fastify';
import { LocationDiscoveryService } from '../../../services/pipeline/locationDiscovery/service';

export const locationDiscoveryRoute: FastifyPluginAsync = async (app) => {
  app.get('/pipeline/location-discovery/health', async () => ({ status: 'ok', service: 'locationDiscovery' }));

  app.post(
    '/pipeline/location-discovery/process',
    { schema: { description: 'Discover and normalize insured-subject locations', body: { type: 'object' }, response: { 200: { type: 'object', additionalProperties: true } } } },
    async (request) => {
      const svc = new LocationDiscoveryService();
      return svc.process(request.body);
    },
  );
};
