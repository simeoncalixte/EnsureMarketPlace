import Fastify from 'fastify';
import { storageSearchRoute } from './route';

describe('Storage & Search pipeline routes', () => {
  let app: any;
  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(storageSearchRoute, { prefix: '/api' });
    await app.ready();
  });
  afterAll(async () => {
    if (app && typeof app.close === 'function') await app.close();
  });

  test('GET /api/pipeline/storage-search/health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/pipeline/storage-search/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ status: 'ok', service: 'storageSearch' });
  });
});
