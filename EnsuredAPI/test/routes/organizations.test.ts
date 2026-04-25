import { buildApp } from '../../src/app';
import { initTestDb, truncateTables } from '../helpers/db';
import { Organization } from '../../src/db/models/identity.models';

describe('GET /api/Organizations', () => {
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

  it('returns organizations from the capitalized route alias', async () => {
    const created = await Organization.bulkCreate(
      [
        { name: 'Alpha Capital Fund', type: 'investor_fund' },
        { name: 'Pinnacle Re Insurance', type: 'insurer' },
      ],
      { returning: true },
    );

    const res = await app.inject({ method: 'GET', url: '/api/Organizations' });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(created.length);
    expect(body.map((org: { name: string }) => org.name)).toEqual(
      expect.arrayContaining(['Alpha Capital Fund', 'Pinnacle Re Insurance']),
    );
  });

  it('returns a single organization from the capitalized id route alias', async () => {
    const org = await Organization.create({ name: 'Platform Ops', type: 'admin' });

    const res = await app.inject({ method: 'GET', url: `/api/Organizations/${org.id}` });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.id).toBe(org.id);
    expect(body.name).toBe('Platform Ops');
  });
});