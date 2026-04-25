import Fastify from 'fastify';
import { validationRoute } from './route';

describe('Validation pipeline routes', () => {
  let app: any;
  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(validationRoute, { prefix: '/api' });
    await app.ready();
  });
  afterAll(async () => {
    if (app && typeof app.close === 'function') await app.close();
  });

  test('GET /api/pipeline/validation/health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/pipeline/validation/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ status: 'ok', service: 'validation' });
  });
});
