import Fastify, { FastifyInstance } from 'fastify';
import { initTestDb } from '../helpers/db';
import { User } from '../../src/db/models';
import { investorsRoute } from '../../src/routes/investors';
import { reinsuranceSeedRoute } from '../../src/routes/reinsuranceSeed';

type InvestorDeal = {
  id: string;
  investorUserId: number;
  investorProfileId: number;
  dealId: number;
  dealName: string;
  dealStatus: string;
  trancheId: number;
  trancheName: string;
  riskLevel: string;
  expectedReturnPct: number;
  capitalRequired: number;
  fundedAmount: number;
  pendingAmount: number;
  investorCommittedAmount: number;
  investorAllocationPct: number;
  status: 'active' | 'available';
};

type InvestorDashboard = {
  summary: {
    totalInvested: number;
    totalAvailable: number;
    activePositions: number;
    availableDeals: number;
    blendedIrr: number;
    projectedAnnualReturn: number;
    capitalAtRisk: number;
    liveTranches: number;
  };
  deals: InvestorDeal[];
};

describe('GET /api/investors/*', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await initTestDb();
    app = Fastify({ logger: false });
    app.register(reinsuranceSeedRoute, { prefix: '/api' });
    app.register(investorsRoute, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(async () => {
    await initTestDb();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns a default investor that exists in the database', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/seed/reinsurance',
      payload: { investorCount: 4, tranchesPerDeal: 3 },
    });

    const res = await app.inject({ method: 'GET', url: '/api/investors/default' });
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.payload) as {
      investorUserId: number;
      investorProfileId: number;
      email: string;
    };

    expect(typeof body.investorUserId).toBe('number');
    expect(typeof body.investorProfileId).toBe('number');
    expect(body.email).toContain('@');
  });

  it('returns investor-associated active deals for a valid investor', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/seed/reinsurance',
      payload: { investorCount: 4, tranchesPerDeal: 3 },
    });

    const investors = await User.findAll({ where: { role: 'investor' }, order: [['id', 'ASC']] });
    expect(investors.length).toBeGreaterThan(1);

    const firstInvestor = investors[0];
    const lastInvestor = investors[investors.length - 1];

    const firstRes = await app.inject({ method: 'GET', url: `/api/investors/${firstInvestor.id}/deals/active` });
    expect(firstRes.statusCode).toBe(200);
    const firstBody = JSON.parse(firstRes.payload) as InvestorDeal[];
    expect(Array.isArray(firstBody)).toBe(true);
    expect(firstBody.length).toBeGreaterThan(0);
    expect(firstBody.every((row) => row.investorUserId === firstInvestor.id)).toBe(true);

    const lastRes = await app.inject({ method: 'GET', url: `/api/investors/${lastInvestor.id}/deals/active` });
    expect(lastRes.statusCode).toBe(200);
    const lastBody = JSON.parse(lastRes.payload) as InvestorDeal[];
    expect(lastBody.every((row) => row.investorUserId === lastInvestor.id)).toBe(true);

    // Seed logic subscribes all but the final investor, so their committed amounts should be zero.
    const firstInvestorHasCommitment = firstBody.some((row) => row.investorCommittedAmount > 0);
    const lastInvestorHasCommitment = lastBody.some((row) => row.investorCommittedAmount > 0);
    expect(firstInvestorHasCommitment).toBe(true);
    expect(lastInvestorHasCommitment).toBe(false);
  });

  it('returns backend-calculated dashboard summary for a valid investor', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/seed/reinsurance',
      payload: { investorCount: 4, tranchesPerDeal: 3 },
    });

    const investors = await User.findAll({ where: { role: 'investor' }, order: [['id', 'ASC']] });
    const firstInvestor = investors[0];
    const lastInvestor = investors[investors.length - 1];

    const firstRes = await app.inject({ method: 'GET', url: `/api/investors/${firstInvestor.id}/dashboard` });
    expect(firstRes.statusCode).toBe(200);
    const firstBody = JSON.parse(firstRes.payload) as InvestorDashboard;
    expect(Array.isArray(firstBody.deals)).toBe(true);
    expect(firstBody.summary.capitalAtRisk).toBeGreaterThan(0);
    expect(firstBody.summary.totalInvested).toBeGreaterThan(0);
    expect(firstBody.summary.activePositions).toBeGreaterThan(0);

    const lastRes = await app.inject({ method: 'GET', url: `/api/investors/${lastInvestor.id}/dashboard` });
    expect(lastRes.statusCode).toBe(200);
    const lastBody = JSON.parse(lastRes.payload) as InvestorDashboard;
    expect(lastBody.summary.capitalAtRisk).toBe(0);
    expect(lastBody.summary.totalInvested).toBe(0);
  });

  it('returns 404 for non-investor user id', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/seed/reinsurance',
      payload: { investorCount: 3, tranchesPerDeal: 2 },
    });

    const admin = await User.findOne({ where: { role: 'admin' } });
    expect(admin).toBeTruthy();

    const res = await app.inject({ method: 'GET', url: `/api/investors/${admin!.id}/deals/active` });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.payload)).toEqual({ error: 'investor_not_found' });
  });
});
