import Fastify from 'fastify';
import { createPipelineTransformationReporter } from '../../../test/helpers/pipelineTransformations';
import { classificationRoute } from './route';
import { classifySubmissionLineOfBusiness } from './service';

describe('Classification pipeline routes', () => {
  const transformations = createPipelineTransformationReporter('classification');
  let app: any;
  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(classificationRoute, { prefix: '/api' });
    await app.ready();
  });
  afterAll(async () => {
    if (app && typeof app.close === 'function') await app.close();
    await transformations.write();
  });

  test('GET /api/pipeline/classification/health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/pipeline/classification/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ status: 'ok', service: 'classification' });
  });

  test('pure classifier maps hurricane submissions to catastrophe property windstorm', () => {
    const input = {
      text: [
        'Risk Type: Hurricane',
        'Trigger Type: Parametric',
        'Oracle Source: NOAA certified_weather_station feed',
        'Property Location: 123 Coast Road, Miami, FL',
      ].join('\n'),
    };
    const result = classifySubmissionLineOfBusiness(input);

    transformations.record({
      stage: 'classification',
      testName: 'pure classifier maps hurricane submissions to catastrophe property windstorm',
      description: 'Extracted submission text is classified into line of business and subtype.',
      before: input,
      after: result,
    });

    expect(result.lineOfBusinessCode).toBe('catastrophe_property');
    expect(result.lineOfBusinessSubTypeCode).toBe('catastrophe_property_windstorm');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    expect(result.needsReview).toBe(false);
  });
});
