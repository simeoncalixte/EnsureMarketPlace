import Fastify from 'fastify';
import { extractionRoute } from './route';

describe('Extraction pipeline routes', () => {
  let app: any;
  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(extractionRoute, { prefix: '/api' });
    await app.ready();
  });
  afterAll(async () => {
    if (app && typeof app.close === 'function') await app.close();
  });

  test('GET /api/pipeline/extraction/health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/pipeline/extraction/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ status: 'ok', service: 'extraction' });
  });
});
