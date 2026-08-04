import { FastifyPluginAsync } from 'fastify';
import { IngestionService } from '../../../services/pipeline/ingestion/service';

export const ingestionRoute: FastifyPluginAsync = async (app) => {
  app.get('/pipeline/ingestion/health', async () => ({ status: 'ok', service: 'ingestion' }));

  app.post(
    '/pipeline/ingestion/process',
    {
      schema: {
        description: 'Invoke ingestion processing for a submission',
        body: { type: 'object' },
        response: { 200: { type: 'object', additionalProperties: true } },
      },
    },
    async (request) => {
      const svc = new IngestionService();
      const res = await svc.process(request.body);
      return res;
    }
  );
};
