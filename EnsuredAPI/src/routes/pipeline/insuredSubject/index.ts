import { FastifyPluginAsync } from 'fastify';
import { InsuredSubjectService, loadInsuredSubjects } from '../../../services/pipeline/insuredSubject/service';

export const insuredSubjectRoute: FastifyPluginAsync = async (app) => {
  app.get('/pipeline/insured-subject/health', async () => ({ status: 'ok', service: 'insuredSubject' }));

  // Fetch the insured subjects and attributes previously extracted for a
  // submission. Field definitions resolve from the reusable insured-subjects page
  // template. (Static `health` segment resolves ahead of this `/:submissionId`
  // param route.)
  app.get<{ Params: { submissionId: string } }>(
    '/pipeline/insured-subject/:submissionId',
    { schema: { params: { type: 'object', properties: { submissionId: { type: 'string' } }, required: ['submissionId'] } } },
    async (request, reply) => {
      const result = await loadInsuredSubjects(Number(request.params.submissionId));
      if (!result) return reply.code(404).send({ error: 'No insured subjects for this submission' });
      return result;
    },
  );

  app.post(
    '/pipeline/insured-subject/process',
    {
      schema: {
        description: 'Determine the insured subject(s) and extract every key-value pair relative to each (SOV, address, TIV, construction …).',
        body: { type: 'object' },
        response: { 200: { type: 'object', additionalProperties: true } },
      },
    },
    async (request) => {
      const svc = new InsuredSubjectService();
      return svc.process(request.body);
    }
  );
};
