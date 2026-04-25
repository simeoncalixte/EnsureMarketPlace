import Fastify from 'fastify';
import { ingestionRoute } from './route';

describe('Ingestion pipeline routes', () => {
  let app: any;
  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(ingestionRoute, { prefix: '/api' });
    await app.ready();
  });
  afterAll(async () => {
    if (app && typeof app.close === 'function') {
      await app.close();
    }
  });

  test('GET /api/pipeline/ingestion/health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/pipeline/ingestion/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ status: 'ok', service: 'ingestion' });
  });

  test('POST /api/pipeline/ingestion/process', async () => {
    const payload = { submissionId: 'abc' };
    const res = await app.inject({ method: 'POST', url: '/api/pipeline/ingestion/process', payload });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body).toHaveProperty('ok', true);
    expect(body).toHaveProperty('service', 'ingestion');
  });
});
