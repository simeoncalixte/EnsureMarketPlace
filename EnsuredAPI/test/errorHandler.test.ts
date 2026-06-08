import Fastify, { FastifyInstance } from 'fastify';
import { registerErrorHandlers } from '../src/app';

/**
 * Exercises the shared error envelope in isolation (no DB) by attaching it to a
 * tiny app with a route that throws and a route with a strict body schema.
 */
function buildTestApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  registerErrorHandlers(app);
  app.get('/boom', async () => {
    throw new Error('kaboom');
  });
  app.post(
    '/strict',
    { schema: { body: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } } },
    async () => ({ ok: true }),
  );
  return app;
}

describe('global error envelope', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = buildTestApp();
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
  });

  it('turns an uncaught throw into a 500 envelope with a requestId', async () => {
    const res = await app.inject({ method: 'GET', url: '/boom' });
    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.payload);
    expect(body).toMatchObject({ ok: false, code: 'INTERNAL_ERROR', statusCode: 500 });
    expect(typeof body.requestId).toBe('string');
    expect(body.error).toBe('kaboom'); // exposed outside production
  });

  it('turns a schema validation failure into a 400 envelope with details', async () => {
    const res = await app.inject({ method: 'POST', url: '/strict', payload: {} });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body).toMatchObject({ ok: false, code: 'VALIDATION_ERROR', statusCode: 400 });
    expect(body.details).toBeDefined();
  });

  it('returns the envelope for an unknown route (404)', async () => {
    const res = await app.inject({ method: 'GET', url: '/does-not-exist' });
    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.payload);
    expect(body).toMatchObject({ ok: false, code: 'NOT_FOUND', statusCode: 404 });
    expect(body.error).toContain('not found');
  });

  it('masks internal 5xx messages in production', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = await app.inject({ method: 'GET', url: '/boom' });
      expect(JSON.parse(res.payload).error).toBe('Internal Server Error');
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});
