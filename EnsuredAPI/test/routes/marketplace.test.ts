import Fastify, { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { initTestDb } from '../helpers/db';
import { Deal } from '../../src/db/models';
import { marketplaceRoute } from '../../src/routes/marketplace';
import { reinsuranceSeedRoute } from '../../src/routes/reinsuranceSeed';

type Opportunity = {
  id: string;
  dealId: number;
  trancheId: number;
  fundingState: 'new' | 'partially_funded';
  dealName: string;
  dealStatus: string;
  trancheName: string;
  riskLevel: string;
  expectedReturnPct: number;
  maxLoss: number;
  durationMonths: number;
  capitalRequired: number;
  committedCapital: number;
  fundedAmount: number;
  pendingAmount: number;
  fundingProgressPct: number;
  startDate: string;
  endDate: string;
};

describe('GET /api/marketplace/opportunities/active-pending-funding', () => {
  (global as any).jest?.setTimeout?.(30000);
  let app: FastifyInstance;

  beforeAll(async () => {
    await initTestDb();
    app = Fastify({ logger: false });
    app.register(reinsuranceSeedRoute, { prefix: '/api' });
    app.register(marketplaceRoute, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(async () => {
    await initTestDb();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the line of business taxonomy with primary and subtype entries', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/marketplace/line-of-business-taxonomy',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as { primaryTypes?: Array<{ code: string; label: string; subTypes: Array<{ code: string; label: string }> }> };
    expect(Array.isArray(body.primaryTypes)).toBe(true);
    expect(body.primaryTypes).toHaveLength(60);
    expect(body.primaryTypes?.every((primary) => Array.isArray(primary.subTypes) && primary.subTypes.length > 0)).toBe(true);

    const primaryLabels = new Set(body.primaryTypes?.map((primary) => primary.label));
    expect(primaryLabels.has('Property')).toBe(true);
    expect(primaryLabels.has('Cyber')).toBe(true);

    const totalSubTypes = body.primaryTypes?.reduce((count, primary) => count + primary.subTypes.length, 0) ?? 0;
    expect(totalSubTypes).toBe(240);
  });

  it('returns active opportunities that are new and partially funded', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/seed/reinsurance',
      payload: {
        investorCount: 4,
        tranchesPerDeal: 3,
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/marketplace/opportunities/active-pending-funding',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as Opportunity[];

    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);

    for (const item of body) {
      expect(item.pendingAmount).toBeGreaterThan(0);
      expect(item.capitalRequired).toBeGreaterThan(item.fundedAmount);
      expect(item.committedCapital).toBe(item.fundedAmount);
      expect(['approved', 'fundraising', 'active']).toContain(item.dealStatus);
      expect(item.fundingProgressPct).toBeGreaterThanOrEqual(0);
      expect(item.fundingProgressPct).toBeLessThan(100);
    }

    const states = new Set(body.map((item) => item.fundingState));
    expect(states.has('new')).toBe(true);
    expect(states.has('partially_funded')).toBe(true);

    const hasZeroFunded = body.some((item) => item.fundedAmount === 0 && item.fundingState === 'new');
    const hasPartialFunded = body.some((item) => item.fundedAmount > 0 && item.fundingState === 'partially_funded');

    expect(hasZeroFunded).toBe(true);
    expect(hasPartialFunded).toBe(true);

    // write available deals to a fixtures JSON file for downstream use
    try {
      const fixturesDir = path.resolve(__dirname, '../fixtures');
      fs.mkdirSync(fixturesDir, { recursive: true });
      const deals = Array.from(new Set(body.map((it) => it.dealId))).map((id) => ({ dealId: id, dealName: body.find((b) => b.dealId === id)?.dealName ?? '' }));
      fs.writeFileSync(path.join(fixturesDir, 'deals.json'), JSON.stringify(deals, null, 2), 'utf8');
    } catch (err) {
      // do not fail the test if writing fixtures fails, but log for debugging
      // eslint-disable-next-line no-console
      console.warn('Failed to write deals fixture:', err);
    }
  });

  it('can filter opportunities by dealId', async () => {
    const seedRes = await app.inject({
      method: 'POST',
      url: '/api/seed/reinsurance',
      payload: { investorCount: 4, tranchesPerDeal: 3 },
    });
    expect(seedRes.statusCode).toBe(201);
    const summary = JSON.parse(seedRes.payload) as any;
    const dealId = summary?.ids?.dealId;
    expect(typeof dealId).toBe('number');

    const res = await app.inject({
      method: 'GET',
      url: `/api/marketplace/opportunities/active-pending-funding?dealId=${dealId}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as Opportunity[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.every((it) => it.dealId === dealId)).toBe(true);
  });

  it('persists subject line of business and text location on deal creation', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/marketplace/deals',
      payload: {
        name: 'Subject LOB Location Test',
        coverageLimit: 1000000,
        attachmentPoint: 250000,
        exhaustionPoint: 1500000,
        premium: 75000,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        subjects: [
          {
            subjectLabel: 'Warehouse 1',
            subjectIndex: 1,
            lineOfBusiness: 'Property',
            lineOfBusinessSubType: 'Catastrophe',
            locationText: 'Houston, TX',
            assetType: 'building',
            constructionType: 'masonry',
            occupancyType: 'commercial',
            replacementCost: 500000,
            latitude: 29.7604,
            longitude: -95.3698,
            vulnerabilityScore: 0.42,
          },
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    const createdDeal = await Deal.findOne({ order: [['id', 'DESC']] });
    expect(createdDeal).not.toBeNull();
    expect(Array.isArray(createdDeal?.subjectsJson)).toBe(true);
    expect(createdDeal?.subjectsJson).toHaveLength(1);
    expect(createdDeal?.subjectsJson?.[0]).toMatchObject({
      subjectLabel: 'Warehouse 1',
      lineOfBusiness: 'Property',
      lineOfBusinessSubType: 'Catastrophe',
      locationText: 'Houston, TX',
    });
  });
});
