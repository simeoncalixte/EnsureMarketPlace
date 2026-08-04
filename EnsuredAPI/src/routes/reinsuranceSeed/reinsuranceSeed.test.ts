import Fastify, { FastifyInstance } from 'fastify';
import { initTestDb } from '../../../test/helpers/db';
import { reinsuranceSeedRoute } from './index';
import { Deal, Policy, SPV, Tranche } from '../../db/models';

describe('POST /api/seed/reinsurance', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await initTestDb();
    app = Fastify({ logger: false });
    app.register(reinsuranceSeedRoute, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(async () => {
    await initTestDb();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 201 and summary for default seed', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/seed/reinsurance', payload: {} });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload) as any;
    expect(body.batchId).toBeDefined();
    expect(body.policies).toBe(8);
    expect(body.exposures).toBe(16);
    expect(body.tranches).toBe(3);

    const seededDeal = await Deal.findByPk(body.ids.dealId);
    const seededSpv = await SPV.findByPk(body.ids.spvId);
    expect(seededDeal).not.toBeNull();
    expect(seededSpv).not.toBeNull();
  });

  it('accepts custom counts and persists expected volumes', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/seed/reinsurance',
      payload: {
        investorCount: 4,
        policyCount: 6,
        exposuresPerPolicy: 2,
        tranchesPerDeal: 2,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload) as any;

    expect(body.investorProfiles).toBe(4);
    expect(body.policies).toBe(6);
    expect(body.exposures).toBe(12);
    expect(body.tranches).toBe(2);
    expect(body.commitments).toBe(4);
    expect(body.subscriptions).toBe(3);
    expect(body.tokens).toBe(2);

    expect(await Policy.count()).toBe(6);
    expect(await Tranche.count()).toBe(2);
  });
});
