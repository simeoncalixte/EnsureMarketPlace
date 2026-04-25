import { buildApp } from '../src/app';

describe('buildApp()', () => {
  let app: any;

  beforeAll(() => {
    app = buildApp();
  });

  afterAll(async () => {
    if (app && typeof app.close === 'function') {
      await app.close();
    }
  });

  test('returns a Fastify instance', () => {
    expect(app).toBeDefined();
    expect(typeof app.register).toBe('function');
    expect(typeof app.inject).toBe('function');
  });

  test('responds 200 on GET /health', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.payload);
    expect(payload).toEqual({ status: 'ok' });
  });
});
