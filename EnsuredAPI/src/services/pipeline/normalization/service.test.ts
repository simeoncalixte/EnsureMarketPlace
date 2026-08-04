import Fastify from 'fastify';
import { createPipelineTransformationReporter } from '../../../../test/helpers/pipelineTransformations';
import { normalizationRoute } from '../../../routes/pipeline/normalization';

describe('Normalization pipeline routes', () => {
  const transformations = createPipelineTransformationReporter('normalization');
  let app: any;
  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(normalizationRoute, { prefix: '/api' });
    await app.ready();
  });
  afterAll(async () => {
    if (app && typeof app.close === 'function') await app.close();
    await transformations.write();
  });

  test('GET /api/pipeline/normalization/health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/pipeline/normalization/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ status: 'ok', service: 'normalization' });
  });

  test('POST /api/pipeline/normalization/process preserves canonical extracted fields', async () => {
    const payload = {
      extraction: {
        structuredData: {
          riskType: 'Hurricane',
          limit: 3_000_000,
          expectedYield: 0.12,
        },
      },
    };
    const res = await app.inject({ method: 'POST', url: '/api/pipeline/normalization/process', payload });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    transformations.record({
      stage: 'normalization',
      testName: 'POST /api/pipeline/normalization/process preserves canonical extracted fields',
      description: 'Structured extraction output is shaped into normalized data for downstream services.',
      before: payload,
      after: body,
    });
    expect(body.ok).toBe(true);
    expect(body.normalized).toMatchObject(payload.extraction.structuredData);
  });
});
