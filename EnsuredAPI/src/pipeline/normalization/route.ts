import { FastifyPluginAsync } from 'fastify';
import { NormalizationService } from './service';

export const normalizationRoute: FastifyPluginAsync = async (app) => {
  app.get('/pipeline/normalization/health', async () => ({ status: 'ok', service: 'normalization' }));

  app.post('/pipeline/normalization/process', { schema: { description: 'Run normalization & enrichment', body: { type: 'object' }, response: { 200: { type: 'object', additionalProperties: true } } } }, async (request) => {
    const svc = new NormalizationService();
    return svc.process(request.body);
  });
};
