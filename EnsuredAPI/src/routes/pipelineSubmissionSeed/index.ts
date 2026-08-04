import { FastifyPluginAsync } from 'fastify';
import { seedPipelineSubmissionsSchema, seedPipelineFlowSchema } from './schemas';
import { seedPipelineSubmissionsHandler, seedPipelineFlowHandler } from './handlers';

export const pipelineSubmissionSeedRoute: FastifyPluginAsync = async (app) => {
  app.post('/seed/pipeline-submissions', { schema: seedPipelineSubmissionsSchema }, seedPipelineSubmissionsHandler);

  app.post('/seed/pipeline-flow', { schema: seedPipelineFlowSchema }, seedPipelineFlowHandler);
};

export default pipelineSubmissionSeedRoute;
