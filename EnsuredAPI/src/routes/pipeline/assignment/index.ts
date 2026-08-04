import { FastifyPluginAsync } from 'fastify';
import { AssignmentService } from '../../../services/pipeline/assignment/service';

export const assignmentRoute: FastifyPluginAsync = async (app) => {
  app.get('/pipeline/assignment/health', async () => ({ status: 'ok', service: 'assignment' }));

  app.post(
    '/pipeline/assignment/process',
    {
      schema: {
        description:
          'Assign a submission to a department, team, and person based on the role that should own its transaction type.',
        body: { type: 'object' },
        response: { 200: { type: 'object', additionalProperties: true } },
      },
    },
    async (request) => {
      const svc = new AssignmentService();
      return svc.process(request.body);
    },
  );
};
