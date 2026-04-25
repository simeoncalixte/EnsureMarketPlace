import { FastifyPluginAsync } from 'fastify';
import { ExtractionService } from './service';

export const extractionRoute: FastifyPluginAsync = async (app) => {
  app.get('/pipeline/extraction/health', async () => ({ status: 'ok', service: 'extraction' }));

  app.post('/pipeline/extraction/process', { schema: { description: 'Run data extraction', body: { type: 'object' }, response: { 200: { type: 'object', additionalProperties: true } } } }, async (request) => {
    const svc = new ExtractionService();
    return svc.process(request.body);
  });
};
