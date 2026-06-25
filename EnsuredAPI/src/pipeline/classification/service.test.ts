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

  test('flags a multi-line-of-business package and lists the distinct lines', () => {
    const result = classifySubmissionLineOfBusiness({
      text: [
        'Document 1: Marine Cargo shipment, bill of lading, freight, cold chain cargo.',
        'Document 2: Directors and Officers d&o public company side a side b coverage.',
        'Document 3: Cyber ransomware data breach network security privacy.',
      ].join('\n'),
    });

    expect(result.multiLineOfBusiness).toBe(true);
    expect(result.needsReview).toBe(true); // multi-LOB always warrants review
    const codes = result.lineOfBusinesses.map((l) => l.lineOfBusinessCode);
    expect(codes.length).toBeGreaterThanOrEqual(2);
    expect(codes).toContain(result.lineOfBusinessCode); // headline is always in the set
  });

  test('a single-line submission is NOT flagged as multi-line', () => {
    const result = classifySubmissionLineOfBusiness({
      text: 'Cyber liability: ransomware, network security, data breach, privacy, business interruption.',
    });
    expect(result.multiLineOfBusiness).toBe(false);
    expect(result.lineOfBusinesses).toHaveLength(1);
  });

  test('pure classifier returns an explicit unclassified result when no keyword matches', () => {
    // Garbled OCR / non-insurance text must NOT silently become a default line.
    const result = classifySubmissionLineOfBusiness({ text: 'zzqx 8812 vortma lpejq nnnn' });
    expect(result.lineOfBusinessCode).toBe('unclassified');
    expect(result.lineOfBusinessLabel).toBe('Unclassified');
    expect(result.confidence).toBe(0);
    expect(result.needsReview).toBe(true);
    expect(result.alternatives).toEqual([]);
  });
});
