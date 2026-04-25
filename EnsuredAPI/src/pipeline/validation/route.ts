import { FastifyPluginAsync } from 'fastify';
import { ValidationService } from './service';

export const validationRoute: FastifyPluginAsync = async (app) => {
  app.get('/pipeline/validation/health', async () => ({ status: 'ok', service: 'validation' }));

  app.post('/pipeline/validation/process', { schema: { description: 'Run validation & QC', body: { type: 'object' }, response: { 200: { type: 'object', additionalProperties: true } } } }, async (request) => {
    const svc = new ValidationService();
    return svc.process(request.body);
  });
};
