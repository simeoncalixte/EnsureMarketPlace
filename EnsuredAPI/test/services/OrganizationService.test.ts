import { OrganizationService } from '../../src/services/OrganizationService';
import { initTestDb, truncateTables } from '../helpers/db';

describe('OrganizationService', () => {
  let service: OrganizationService;

  beforeAll(async () => {
    await initTestDb();
  });

  beforeEach(async () => {
    service = new OrganizationService();
    await truncateTables('organizations');
  });

  describe('create()', () => {
    it('inserts a row and returns it with an auto-generated id', async () => {
      const input = { name: 'Test Fund', type: 'investor_fund' as const };

      const org = await service.create(input);

      expect(org.id).toBeDefined();
      expect(typeof org.id).toBe('number');
      expect(org.name).toBe('Test Fund');
      expect(org.type).toBe('investor_fund');
    });

    it('persists all three organization types', async () => {
      const investorOrg = await service.create({ name: 'Fund A', type: 'investor_fund' });
      const insurerOrg  = await service.create({ name: 'Insurer B', type: 'insurer' });
      const adminOrg    = await service.create({ name: 'Admin C', type: 'admin' });

      expect(investorOrg.type).toBe('investor_fund');
      expect(insurerOrg.type).toBe('insurer');
      expect(adminOrg.type).toBe('admin');
    });
  });

  describe('findById()', () => {
    it('retrieves an organization by its database id', async () => {
      const created = await service.create({ name: 'Acme Re', type: 'insurer' });

      const found = await service.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.name).toBe('Acme Re');
    });

    it('returns null when no organization matches the id', async () => {
      const result = await service.findById(999999);

      expect(result).toBeNull();
    });
  });

  describe('findAll()', () => {
    it('returns every row in the organizations table', async () => {
      await service.create({ name: 'Alpha Capital', type: 'investor_fund' });
      await service.create({ name: 'Pinnacle Re',   type: 'insurer' });

      const all = await service.findAll();

      expect(all).toHaveLength(2);
    });

    it('returns an empty array when no organizations exist', async () => {
      const all = await service.findAll();

      expect(all).toHaveLength(0);
    });
  });

  describe('seed()', () => {
    it('creates exactly 5 rows by default (3 fixed + 2 extra)', async () => {
      await service.seed();

      const all = await service.findAll();
      expect(all).toHaveLength(5);
    });

    it('covers all three organization types', async () => {
      await service.seed(0);

      const all  = await service.findAll();
      const types = all.map((o) => o.type);

      expect(types).toContain('investor_fund');
      expect(types).toContain('insurer');
      expect(types).toContain('admin');
    });

    it('creates only 3 rows when extras is 0', async () => {
      await service.seed(0);

      const all = await service.findAll();
      expect(all).toHaveLength(3);
    });

    it('creates 1 fixed + N extra investor_fund rows', async () => {
      await service.seed(3);

      const all          = await service.findAll();
      const investorFunds = all.filter((o) => o.type === 'investor_fund');

      expect(investorFunds).toHaveLength(4); // 1 fixed + 3 extras
    });

    it('all seeded organizations have non-empty names', async () => {
      await service.seed();

      const all = await service.findAll();
      all.forEach((o) => expect(o.name.trim().length).toBeGreaterThan(0));
    });

    it('each row receives a unique database id', async () => {
      await service.seed();

      const all = await service.findAll();
      const ids = all.map((o) => o.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(all.length);
    });
  });
});
