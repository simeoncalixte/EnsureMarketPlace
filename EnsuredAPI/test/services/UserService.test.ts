import { UserService } from '../../src/services/UserService';
import { Organization } from '../../src/db/models/identity.models';
import { initTestDb, truncateTables } from '../helpers/db';

describe('UserService', () => {
  let service: UserService;

  // Org ids reused across all tests in this file.
  let investorOrgId: number;
  let insurerOrgId: number;
  let adminOrgId: number;
  let extraOrgId0: number;
  let extraOrgId1: number;

  beforeAll(async () => {
    await initTestDb();

    // Create the organizations needed for user FK constraints once per file.
    const [inv, ins, adm, ext0, ext1] = await Organization.bulkCreate(
      [
        { name: 'Alpha Capital Fund',         type: 'investor_fund' },
        { name: 'Pinnacle Re Insurance',       type: 'insurer' },
        { name: 'Ensured Platform Operations', type: 'admin' },
        { name: 'Beta Capital',                type: 'investor_fund' },
        { name: 'Gamma Capital',               type: 'investor_fund' },
      ],
      { returning: true },
    );

    investorOrgId = inv.id;
    insurerOrgId  = ins.id;
    adminOrgId    = adm.id;
    extraOrgId0   = ext0.id;
    extraOrgId1   = ext1.id;
  });

  beforeEach(async () => {
    service = new UserService();
    // Only truncate users; keeps the orgs created in beforeAll alive.
    await truncateTables('users');
  });

  // ─── create() ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('inserts a user and returns it with an auto-generated id', async () => {
      const user = await service.create({
        organizationId: investorOrgId,
        email: 'jane.doe@test.com',
        passwordHash: 'hashed_pw',
        role: 'investor',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      expect(user.id).toBeDefined();
      expect(typeof user.id).toBe('number');
      expect(user.email).toBe('jane.doe@test.com');
      expect(user.role).toBe('investor');
    });

    it('correctly stores the organizationId foreign key', async () => {
      const user = await service.create({
        organizationId: insurerOrgId,
        email: 'insurer@test.com',
        passwordHash: 'hashed_pw',
        role: 'insurer',
        firstName: 'Morgan',
        lastName: 'Reyes',
      });

      expect(user.organizationId).toBe(insurerOrgId);
    });

    it('accepts a null organizationId', async () => {
      const user = await service.create({
        organizationId: null,
        email: 'no-org@test.com',
        passwordHash: 'hashed_pw',
        role: 'admin',
        firstName: 'Solo',
        lastName: 'Admin',
      });

      expect(user.organizationId).toBeNull();
    });
  });

  // ─── findById() ───────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('retrieves a user by their database id', async () => {
      const created = await service.create({
        organizationId: adminOrgId,
        email: 'find-me@test.com',
        passwordHash: 'hash',
        role: 'analyst',
        firstName: 'Sam',
        lastName: 'Nguyen',
      });

      const found = await service.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.email).toBe('find-me@test.com');
    });

    it('returns null when the user does not exist', async () => {
      const result = await service.findById(999999);

      expect(result).toBeNull();
    });
  });

  // ─── findAll() ────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns every user row', async () => {
      await service.create({ organizationId: investorOrgId, email: 'a@t.com', passwordHash: 'h', role: 'investor',  firstName: 'A', lastName: 'A' });
      await service.create({ organizationId: insurerOrgId,  email: 'b@t.com', passwordHash: 'h', role: 'insurer',   firstName: 'B', lastName: 'B' });
      await service.create({ organizationId: adminOrgId,    email: 'c@t.com', passwordHash: 'h', role: 'admin',     firstName: 'C', lastName: 'C' });

      const all = await service.findAll();

      expect(all).toHaveLength(3);
    });

    it('returns an empty array when no users exist', async () => {
      const all = await service.findAll();

      expect(all).toHaveLength(0);
    });
  });

  // ─── findByRole() ─────────────────────────────────────────────────────────────

  describe('findByRole()', () => {
    it('returns only users matching the given role', async () => {
      await service.create({ organizationId: investorOrgId, email: 'inv1@t.com', passwordHash: 'h', role: 'investor', firstName: 'I1', lastName: 'X' });
      await service.create({ organizationId: investorOrgId, email: 'inv2@t.com', passwordHash: 'h', role: 'investor', firstName: 'I2', lastName: 'X' });
      await service.create({ organizationId: adminOrgId,    email: 'adm@t.com',  passwordHash: 'h', role: 'admin',    firstName: 'A',  lastName: 'X' });

      const investors = await service.findByRole('investor');

      expect(investors).toHaveLength(2);
      investors.forEach((u) => expect(u.role).toBe('investor'));
    });

    it('returns an empty array when no users have the given role', async () => {
      const analysts = await service.findByRole('analyst');

      expect(analysts).toHaveLength(0);
    });
  });

  // ─── seed() ───────────────────────────────────────────────────────────────────

  describe('seed()', () => {
    const buildOrgMap = (investorExtra0: number, investorExtra1: number) => ({
      investor_fund_primary: investorOrgId,
      insurer:               insurerOrgId,
      admin:                 adminOrgId,
      investor_fund_extra_0: investorExtra0,
      investor_fund_extra_1: investorExtra1,
    });

    it('creates 6 rows by default (4 fixed + 2 extra investors)', async () => {
      await service.seed(buildOrgMap(extraOrgId0, extraOrgId1));

      const all = await service.findAll();
      expect(all).toHaveLength(6);
    });

    it('covers all four roles', async () => {
      await service.seed(buildOrgMap(extraOrgId0, extraOrgId1));

      const all   = await service.findAll();
      const roles = new Set(all.map((u) => u.role));

      expect(roles).toContain('investor');
      expect(roles).toContain('insurer');
      expect(roles).toContain('admin');
      expect(roles).toContain('analyst');
    });

    it('creates exactly 4 rows when extraInvestors is 0', async () => {
      await service.seed(buildOrgMap(extraOrgId0, extraOrgId1), 0);

      const all = await service.findAll();
      expect(all).toHaveLength(4);
    });

    it('assigns the insurer org to the insurer user', async () => {
      await service.seed(buildOrgMap(extraOrgId0, extraOrgId1), 0);

      const [insurerUser] = await service.findByRole('insurer');

      expect(insurerUser.organizationId).toBe(insurerOrgId);
    });

    it('assigns the admin org to both the admin and analyst users', async () => {
      await service.seed(buildOrgMap(extraOrgId0, extraOrgId1), 0);

      const [adminUser]   = await service.findByRole('admin');
      const [analystUser] = await service.findByRole('analyst');

      expect(adminUser.organizationId).toBe(adminOrgId);
      expect(analystUser.organizationId).toBe(adminOrgId);
    });

    it('assigns correct extra org ids to additional investor users', async () => {
      await service.seed(buildOrgMap(extraOrgId0, extraOrgId1), 2);

      const investors = await service.findByRole('investor');
      // 1 fixed + 2 extras = 3 investors total
      expect(investors).toHaveLength(3);

      const extraOrgIds = investors
        .map((u) => u.organizationId)
        .filter((id) => id !== investorOrgId);

      expect(extraOrgIds).toContain(extraOrgId0);
      expect(extraOrgIds).toContain(extraOrgId1);
    });

    it('all seeded users have non-empty email addresses', async () => {
      await service.seed(buildOrgMap(extraOrgId0, extraOrgId1));

      const all = await service.findAll();
      all.forEach((u) => expect(u.email.trim().length).toBeGreaterThan(0));
    });

    it('each seeded user receives a unique database id', async () => {
      await service.seed(buildOrgMap(extraOrgId0, extraOrgId1));

      const all = await service.findAll();
      const ids = all.map((u) => u.id);

      expect(new Set(ids).size).toBe(all.length);
    });
  });
});
