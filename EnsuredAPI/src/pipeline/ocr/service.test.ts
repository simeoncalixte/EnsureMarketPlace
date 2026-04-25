import Fastify from 'fastify';
import { ocrRoute } from './route';

describe('OCR pipeline routes', () => {
  let app: any;
  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(ocrRoute, { prefix: '/api' });
    await app.ready();
  });
  afterAll(async () => {
    if (app && typeof app.close === 'function') await app.close();
  });

  test('GET /api/pipeline/ocr/health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/pipeline/ocr/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ status: 'ok', service: 'ocr' });
  });
});
