import Fastify from 'fastify';
import { createPipelineTransformationReporter } from '../../../test/helpers/pipelineTransformations';
import { storageSearchRoute } from './route';

describe('Storage & Search pipeline routes', () => {
  const transformations = createPipelineTransformationReporter('storageSearch');
  let app: any;
  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(storageSearchRoute, { prefix: '/api' });
    await app.ready();
  });
  afterAll(async () => {
    if (app && typeof app.close === 'function') await app.close();
    await transformations.write();
  });

  test('GET /api/pipeline/storage-search/health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/pipeline/storage-search/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ status: 'ok', service: 'storageSearch' });
  });

  test('POST /api/pipeline/storage-search/process returns completed payload envelope', async () => {
    const payload = {
      submission: { id: 42, organizationId: 7 },
      workflow: { decision: 'PRIORITY_ROUTE', queue: 'priority_queue' },
      normalization: { normalized: { riskType: 'Hurricane', limit: 3_000_000 } },
    };
    const res = await app.inject({ method: 'POST', url: '/api/pipeline/storage-search/process', payload });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    transformations.record({
      stage: 'storage-search',
      testName: 'POST /api/pipeline/storage-search/process returns completed payload envelope',
      description: 'Completed pipeline payload is handed to storage/search and returned as a received envelope.',
      before: payload,
      after: body,
    });
    expect(body.ok).toBe(true);
    expect(body.received).toMatchObject(payload);
  });
});
