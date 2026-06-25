import { FastifyPluginAsync } from 'fastify';
import { SubmissionTypeService } from './service';

export const submissionTypeRoute: FastifyPluginAsync = async (app) => {
  app.get('/pipeline/submission-type/health', async () => ({ status: 'ok', service: 'submissionType' }));

  app.post(
    '/pipeline/submission-type/process',
    {
      schema: {
        description: 'Determine the submission/transaction type (new business, renewal, endorsement, claim, treaty, facultative …)',
        body: { type: 'object' },
        response: { 200: { type: 'object', additionalProperties: true } },
      },
    },
    async (request) => {
      const svc = new SubmissionTypeService();
      return svc.process(request.body);
    }
  );
};
