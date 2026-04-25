import { FastifyPluginAsync } from 'fastify';
import { ClassificationService } from './service';

export const classificationRoute: FastifyPluginAsync = async (app) => {
  app.get('/pipeline/classification/health', async () => ({ status: 'ok', service: 'classification' }));

  app.post(
    '/pipeline/classification/process',
    {
      schema: { description: 'Invoke document classification', body: { type: 'object' }, response: { 200: { type: 'object', additionalProperties: true } } },
    },
    async (request) => {
      const svc = new ClassificationService();
      return svc.process(request.body);
    }
  );
};
