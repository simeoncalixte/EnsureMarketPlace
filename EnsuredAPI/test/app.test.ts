import request from 'supertest';
import { buildApp } from '../src/app';

describe('buildApp', () => {
  it('returns a healthy response', async () => {
    const app = buildApp();

    await app.ready();
    const response = await request(app.server).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });

    await app.close();
  });
});