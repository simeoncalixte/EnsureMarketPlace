import Fastify from 'fastify';
import { workflowRoute } from './route';

describe('Workflow pipeline routes', () => {
  let app: any;
  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(workflowRoute, { prefix: '/api' });
    await app.ready();
  });
  afterAll(async () => {
    if (app && typeof app.close === 'function') await app.close();
  });

  test('GET /api/pipeline/workflow/health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/pipeline/workflow/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ status: 'ok', service: 'workflow' });
  });
});
