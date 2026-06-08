import Fastify from 'fastify';
import { createPipelineTransformationReporter } from '../../../test/helpers/pipelineTransformations';
import { extractionRoute } from './route';

describe('Extraction pipeline routes', () => {
  const transformations = createPipelineTransformationReporter('extraction');
  let app: any;
  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(extractionRoute, { prefix: '/api' });
    await app.ready();
  });
  afterAll(async () => {
    if (app && typeof app.close === 'function') await app.close();
    await transformations.write();
  });

  test('GET /api/pipeline/extraction/health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/pipeline/extraction/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ status: 'ok', service: 'extraction' });
  });

  test('POST /api/pipeline/extraction/process extracts key entities from OCR text', async () => {
    const payload = {
      ocr: {
        text: [
          'Risk Type: Hurricane',
          'Coverage Limit: $3.0M',
          'Deductible: $250,000',
          'Effective Date: 05/01/2026',
          'Expected Yield: 12%',
          'Oracle Source: NOAA certified_weather_station feed',
        ].join('\n'),
      },
    };
    const res = await app.inject({ method: 'POST', url: '/api/pipeline/extraction/process', payload });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    transformations.record({
      stage: 'extraction',
      testName: 'POST /api/pipeline/extraction/process extracts key entities from OCR text',
      description: 'OCR text is transformed into structured submission fields.',
      before: payload,
      after: body,
    });
    expect(body.ok).toBe(true);
    expect(body.structuredData.riskType.toLowerCase()).toContain('hurricane');
    expect(Number(body.structuredData.limit)).toBeGreaterThan(1_000_000);
  });
});
