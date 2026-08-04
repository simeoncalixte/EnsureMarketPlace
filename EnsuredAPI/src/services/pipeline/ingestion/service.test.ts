import Fastify from 'fastify';
import { createPipelineTransformationReporter } from '../../../../test/helpers/pipelineTransformations';
import { ingestionRoute } from '../../../routes/pipeline/ingestion';

describe('Ingestion pipeline routes', () => {
  const transformations = createPipelineTransformationReporter('ingestion');
  let app: any;
  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(ingestionRoute, { prefix: '/api' });
    await app.ready();
  });
  afterAll(async () => {
    if (app && typeof app.close === 'function') {
      await app.close();
    }
    await transformations.write();
  });

  test('GET /api/pipeline/ingestion/health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/pipeline/ingestion/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ status: 'ok', service: 'ingestion' });
  });

  test('POST /api/pipeline/ingestion/process', async () => {
    const payload = { submissionId: 'abc' };
    const res = await app.inject({ method: 'POST', url: '/api/pipeline/ingestion/process', payload });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    transformations.record({
      stage: 'ingestion',
      testName: 'POST /api/pipeline/ingestion/process',
      description: 'Raw ingestion request is transformed into an ingestion service response.',
      before: payload,
      after: body,
    });
    expect(body).toHaveProperty('ok', true);
    expect(body).toHaveProperty('service', 'ingestion');
  });
});
