import { buildApp } from '../../src/app';
import { initTestDb, truncateTables } from '../helpers/db';
import { Organization } from '../../src/db/models/identity.models';

describe('POST /api/seed/organizations', () => {
  let app: ReturnType<typeof buildApp>;

  beforeAll(async () => {
    await initTestDb();
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateTables('organizations');
  });

  it('returns 201 with seeded organizations', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/seed/organizations' });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.count).toBe(5); // 3 fixed + 2 extras default
    expect(Array.isArray(body.organizations)).toBe(true);
  });

  it('each returned organization has id, name, and type', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/seed/organizations' });
    const { organizations } = JSON.parse(res.payload);

    organizations.forEach((o: { id: number; name: string; type: string }) => {
      expect(typeof o.id).toBe('number');
      expect(o.name.length).toBeGreaterThan(0);
      expect(['investor_fund', 'insurer', 'admin']).toContain(o.type);
    });
  });

  it('covers all three organization types', async () => {
    const res  = await app.inject({ method: 'POST', url: '/api/seed/organizations' });
    const { organizations } = JSON.parse(res.payload);
    const types = new Set(organizations.map((o: { type: string }) => o.type));

    expect(types).toContain('investor_fund');
    expect(types).toContain('insurer');
    expect(types).toContain('admin');
  });

  it('respects the extras query parameter', async () => {
    const res  = await app.inject({ method: 'POST', url: '/api/seed/organizations?extras=0' });
    const body = JSON.parse(res.payload);

    expect(body.count).toBe(3);
  });

  it('persists rows to the database', async () => {
    await app.inject({ method: 'POST', url: '/api/seed/organizations' });

    const dbOrgs = await Organization.findAll();
    expect(dbOrgs.length).toBe(5);
  });
});
