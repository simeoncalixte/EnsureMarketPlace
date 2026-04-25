import Fastify from 'fastify';
import { normalizationRoute } from './route';

describe('Normalization pipeline routes', () => {
  let app: any;
  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(normalizationRoute, { prefix: '/api' });
    await app.ready();
  });
  afterAll(async () => {
    if (app && typeof app.close === 'function') await app.close();
  });

  test('GET /api/pipeline/normalization/health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/pipeline/normalization/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ status: 'ok', service: 'normalization' });
  });
});
