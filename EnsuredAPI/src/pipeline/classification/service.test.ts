import Fastify from 'fastify';
import { classificationRoute } from './route';

describe('Classification pipeline routes', () => {
  let app: any;
  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(classificationRoute, { prefix: '/api' });
    await app.ready();
  });
  afterAll(async () => {
    if (app && typeof app.close === 'function') await app.close();
  });

  test('GET /api/pipeline/classification/health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/pipeline/classification/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ status: 'ok', service: 'classification' });
  });
});
