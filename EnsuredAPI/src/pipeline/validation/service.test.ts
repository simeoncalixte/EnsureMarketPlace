import Fastify from 'fastify';
import { createPipelineTransformationReporter } from '../../../test/helpers/pipelineTransformations';
import { validationRoute } from './route';

describe('Validation pipeline routes', () => {
  const transformations = createPipelineTransformationReporter('validation');
  let app: any;
  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(validationRoute, { prefix: '/api' });
    await app.ready();
  });
  afterAll(async () => {
    if (app && typeof app.close === 'function') await app.close();
    await transformations.write();
  });

  test('GET /api/pipeline/validation/health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/pipeline/validation/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ status: 'ok', service: 'validation' });
  });

  test('POST /api/pipeline/validation/process flags bad submissions for more info', async () => {
    const payload = {
      normalization: { normalized: { riskType: 'wind' } },
      extraction: { structuredData: { companyDomain: 'foo.invalid', propertyLocation: 'x' } },
    };
    const res = await app.inject({ method: 'POST', url: '/api/pipeline/validation/process', payload });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    transformations.record({
      stage: 'validation',
      testName: 'POST /api/pipeline/validation/process flags bad submissions for more info',
      description: 'Incomplete or low-quality normalized data is transformed into a MORE_INFO validation decision.',
      before: payload,
      after: body,
    });
    expect(body.ok).toBe(true);
    expect(body.flaggedForMoreInfo).toBe(true);
    expect(body.decision).toBe('MORE_INFO');
  });
});
