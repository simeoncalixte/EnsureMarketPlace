import { FastifyPluginAsync } from 'fastify';
import { WorkflowService } from './service';

export const workflowRoute: FastifyPluginAsync = async (app) => {
  app.get('/pipeline/workflow/health', async () => ({ status: 'ok', service: 'workflow' }));

  app.post('/pipeline/workflow/process', { schema: { description: 'Run workflow & routing', body: { type: 'object' }, response: { 200: { type: 'object', additionalProperties: true } } } }, async (request) => {
    const svc = new WorkflowService();
    return svc.process(request.body);
  });
};
