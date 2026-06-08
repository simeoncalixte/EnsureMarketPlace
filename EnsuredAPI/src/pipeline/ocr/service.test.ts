import Fastify from 'fastify';
import { createPipelineTransformationReporter } from '../../../test/helpers/pipelineTransformations';
import { ocrRoute } from './route';
import { OcrService } from './service';

describe('OCR pipeline routes', () => {
  const transformations = createPipelineTransformationReporter('ocr');
  let app: any;
  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(ocrRoute, { prefix: '/api' });
    await app.ready();
  });
  afterAll(async () => {
    if (app && typeof app.close === 'function') await app.close();
    await transformations.write();
  });

  test('GET /api/pipeline/ocr/health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/pipeline/ocr/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ status: 'ok', service: 'ocr' });
  });

  test('POST /api/pipeline/ocr/process returns missing-submission result for incomplete payload', async () => {
    const payload = { source: 'test-empty-ocr-request' };
    const res = await app.inject({ method: 'POST', url: '/api/pipeline/ocr/process', payload });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    transformations.record({
      stage: 'ocr',
      testName: 'POST /api/pipeline/ocr/process returns missing-submission result for incomplete payload',
      description: 'OCR rejects an incomplete payload before attempting file reads.',
      before: payload,
      after: body,
    });
    expect(body).toMatchObject({ ok: false, service: 'ocr', error: 'missing submission' });
  });

  test('process() reports output through callbacks (purity)', async () => {
    const onFailure = jest.fn();
    const onSuccess = jest.fn();
    const result = await new OcrService().process({ source: 'no-submission' }, { onFailure, onSuccess });

    expect(result).toMatchObject({ ok: false, error: 'missing submission' });
    expect(onFailure).toHaveBeenCalledWith({ submissionId: null, error: 'missing submission' });
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
