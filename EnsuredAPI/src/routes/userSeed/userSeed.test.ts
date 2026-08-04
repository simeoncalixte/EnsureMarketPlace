import { buildApp } from '../../app';
import { initTestDb, truncateTables } from '../../../test/helpers/db';
import { Organization, User } from '../../db/models/identity.models';

describe('POST /api/seed/users', () => {
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
    // Truncate users first (FK child), then organizations (FK parent).
    await truncateTables('users', 'organizations');
  });

  // ─── No organizations ────────────────────────────────────────────────────────

  it('returns 422 when no organizations exist', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/seed/users', payload: {} });

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.payload);
    expect(body.error).toMatch(/seed\/organizations/i);
  });

  // ─── Auto-resolve org map ────────────────────────────────────────────────────

  describe('auto-resolve (no orgIdMap supplied)', () => {
    beforeEach(async () => {
      // Seed orgs via the route so the auto-resolve has rows to work with.
      await app.inject({ method: 'POST', url: '/api/seed/organizations' });
    });

    it('returns 201 with the default 6 users (4 fixed + 2 extra investors)', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/seed/users', payload: {} });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.count).toBe(6);
    });

    it('covers all four roles', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/seed/users', payload: {} });
      const { users } = JSON.parse(res.payload);
      const roles = new Set(users.map((u: { role: string }) => u.role));

      expect(roles).toContain('investor');
      expect(roles).toContain('insurer');
      expect(roles).toContain('admin');
      expect(roles).toContain('analyst');
    });

    it('all users have a non-empty email', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/seed/users', payload: {} });
      const { users } = JSON.parse(res.payload);

      users.forEach((u: { email: string }) => expect(u.email.length).toBeGreaterThan(0));
    });

    it('persists rows to the database', async () => {
      await app.inject({ method: 'POST', url: '/api/seed/users', payload: {} });

      const dbUsers = await User.findAll();
      expect(dbUsers.length).toBe(6);
    });

    it('respects the extraInvestors body parameter', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/seed/users',
        payload: { extraInvestors: 0 },
      });
      const body = JSON.parse(res.payload);

      expect(body.count).toBe(4); // 4 fixed, 0 extras
    });
  });

  // ─── Caller-supplied orgIdMap ─────────────────────────────────────────────────

  describe('caller-supplied orgIdMap', () => {
    let investorOrgId: number;
    let insurerOrgId: number;
    let adminOrgId: number;

    beforeEach(async () => {
      const [inv, ins, adm] = await Organization.bulkCreate(
        [
          { name: 'Alpha Capital', type: 'investor_fund' },
          { name: 'Pinnacle Re',   type: 'insurer' },
          { name: 'Platform Ops',  type: 'admin' },
        ],
        { returning: true },
      );
      investorOrgId = inv.id;
      insurerOrgId  = ins.id;
      adminOrgId    = adm.id;
    });

    it('uses the provided orgIdMap and returns 201', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/seed/users',
        payload: {
          orgIdMap: {
            investor_fund_primary: investorOrgId,
            insurer:               insurerOrgId,
            admin:                 adminOrgId,
          },
          extraInvestors: 0,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.count).toBe(4);
    });

    it('assigns insurer org to the insurer user', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/seed/users',
        payload: {
          orgIdMap: {
            investor_fund_primary: investorOrgId,
            insurer:               insurerOrgId,
            admin:                 adminOrgId,
          },
          extraInvestors: 0,
        },
      });

      const insurerUsers = await User.findAll({ where: { role: 'insurer' } });
      expect(insurerUsers[0].organizationId).toBe(insurerOrgId);
    });
  });
});
