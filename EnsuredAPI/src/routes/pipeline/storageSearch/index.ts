import { FastifyPluginAsync } from 'fastify';
import { StorageSearchService } from '../../../services/pipeline/storageSearch/service';

export const storageSearchRoute: FastifyPluginAsync = async (app) => {
  app.get('/pipeline/storage-search/health', async () => ({ status: 'ok', service: 'storageSearch' }));

  app.post('/pipeline/storage-search/process', { schema: { description: 'Run storage and search ingestion', body: { type: 'object' }, response: { 200: { type: 'object', additionalProperties: true } } } }, async (request) => {
    const svc = new StorageSearchService();
    return svc.process(request.body);
  });
};
