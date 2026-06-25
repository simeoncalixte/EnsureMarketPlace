/**
 * Slice 5.1 — Parametric pricing REAL-DATABASE integration test.
 *
 * Seeds a parametric submission whose canonical `data.parametric` carries a CITED
 * exceedance curve + payout formula, declares the parametric methods via a registry
 * row, then calls computeForSubmission and asserts:
 *   - a ModelRun + PricingVersion are written,
 *   - expected loss matches the hand-verified Σ marginalProb × payout (118,750),
 *   - premium = expectedLoss / parametric targetLossRatio (0.75),
 *   - provenance carries the probabilitySource citation, per-band breakdown, ROL,
 *     and basisRisk = true,
 *   - recompute creates a NEW PricingVersion (audit trail preserved).
 *
 * Requires Postgres on 127.0.0.1:5432 (see test/helpers/db.ts + globalSetup).
 * NOTE: the sandbox blocks the DB connection, so this is authored to be run by the
 * maintainer:
 *   nvm use 24 && npx jest test/integration/parametricCompute.db.test.ts
 */
import { getSequelize } from '../../src/config/database';
import {
  CanonicalSubmission,
  ModelRun,
  Organization,
  Pricing,
  PricingVersion,
  Submission,
} from '../../src/db/models';
import { BenchmarkPrior } from '../../src/db/models/benchmarkPrior.models';
import { initTestDb } from '../helpers/db';
import { upsertRegistry } from '../../src/pipeline/registry/upsert';
import { computeForSubmission } from '../../src/pipeline/compute/service';

const LOB = 'parametric_weather';
const LIMIT = 5_000_000;

describe('Parametric compute — real DB integration (Slice 5.1)', () => {
  (global as any).jest?.setTimeout?.(60000);

  let orgId: number;
  let submissionId: number;

  beforeAll(async () => {
    await initTestDb();
    const org = await Organization.create({ name: 'Parametric Test Insurer', type: 'insurer' } as any);
    orgId = org.id;

    const submission = await Submission.create({ organizationId: org.id, status: 'analysis' } as any);
    submissionId = submission.id;

    // Canonical data carries the taxonomy code + the CITED parametric spec + limit.
    await CanonicalSubmission.create({
      submissionId,
      organizationId: org.id,
      data: {
        lineOfBusiness: LOB,
        'financials.limit': LIMIT,
        parametric: {
          indexName: 'wind',
          payoutFormula: 'min(limit,(wind-130)*125000)',
          probabilitySource:
            'Structurer-cited HURDAT2 wind exceedance curve, 2024 (declared, not derived)',
          exceedancePoints: [
            { indexValue: 140, annualExceedanceProbability: 0.05 },
            { indexValue: 160, annualExceedanceProbability: 0.02 },
            { indexValue: 200, annualExceedanceProbability: 0.005 },
          ],
        },
      },
      version: 1,
      lineOfBusinessCode: LOB,
      lineOfBusinessSubTypeCode: '',
    } as any);

    // The cited parametric benchmark prior (platform default, targetLossRatio 0.75).
    await BenchmarkPrior.create({
      organizationId: null,
      lineOfBusinessCode: 'parametric',
      lineOfBusinessSubTypeCode: '',
      exposureBasis: null,
      lossRate: null,
      targetLossRatio: '0.750000',
      expenseRatio: '0.150000',
      marginTarget: '0.100000',
      fullCredibilityStandard: '1082.0000',
      paramsJson: {},
      source: 'Parametric covers priced to expected payout; 0.75 target loss ratio.',
      sourceUrl: 'https://www.artemis.bm/library/what-is-parametric-insurance/',
      asOfDate: '2024-12-31',
      status: 'active',
    } as any);

    // Also seed a parametric_weather-scoped prior so the resolver finds one for the
    // submission's LOB code (the seed prior above is keyed 'parametric').
    await BenchmarkPrior.create({
      organizationId: null,
      lineOfBusinessCode: LOB,
      lineOfBusinessSubTypeCode: '',
      exposureBasis: null,
      lossRate: null,
      targetLossRatio: '0.750000',
      expenseRatio: '0.150000',
      marginTarget: '0.100000',
      fullCredibilityStandard: '1082.0000',
      paramsJson: {},
      source: 'Parametric weather priced to expected payout; 0.75 target loss ratio.',
      sourceUrl: 'https://www.artemis.bm/library/what-is-parametric-insurance/',
      asOfDate: '2024-12-31',
      status: 'active',
    } as any);

    // Registry row declaring the parametric methods for this LOB.
    await upsertRegistry({
      organizationId: orgId,
      lineOfBusinessCode: LOB,
      lineOfBusinessSubTypeCode: '',
      riskModelingMethod: 'parametric_trigger',
      ratingMethod: 'parametric_premium',
    });
  }, 60000);

  afterAll(async () => {
    await getSequelize().close();
  });

  it('prices a cited parametric curve with band breakdown, ROL, and basisRisk', async () => {
    const result = await computeForSubmission(submissionId);

    // Hand-verified expected loss: Σ marginalProb × payout = 118,750.
    expect(Number(result.expectedLoss)).toBeCloseTo(118_750, 2);

    // Premium = expectedLoss / targetLossRatio (0.75) ≈ 158,333.33.
    expect(Number(result.premium)).toBeCloseTo(158_333.33, 1);

    // var99 still NULL (tail not modeled).
    expect(result.var99).toBeNull();

    // Parametric provenance present.
    const p = result.provenance.parametric;
    expect(p).toBeTruthy();
    expect(p!.modelable).toBe(true);
    expect(p!.basisRisk).toBe(true);
    expect(p!.probabilitySource).toMatch(/HURDAT2/);
    expect(p!.indexName).toBe('wind');
    expect(Array.isArray(p!.bands)).toBe(true);
    expect((p!.bands as any[]).length).toBe(3);
    expect(p!.coverageLimit).toBe(LIMIT);
    // ROL = premium/limit ≈ 0.03167 ; LOL = expectedLoss/limit = 0.02375.
    expect(p!.rateOnLine).toBeCloseTo(158_333.33 / LIMIT, 4);
    expect(p!.lossOnLine).toBeCloseTo(118_750 / LIMIT, 6);

    // basis-risk flag captured.
    expect(result.provenance.flags).toContain('basisRisk:trigger_vs_actual_loss');

    // ModelRun + PricingVersion persisted with the citation.
    const modelRun = await ModelRun.findByPk(result.modelRunId);
    expect(modelRun).toBeTruthy();
    expect((modelRun!.parametersJson as any)?.parametric?.probabilitySource).toMatch(/HURDAT2/);

    expect(result.versionNumber).toBe(1);
    const pv = await PricingVersion.findByPk(result.pricingVersionId);
    expect((pv!.assumptionsJson as any)?.parametric?.rateOnLine).toBeGreaterThan(0);
  });

  it('recompute creates a NEW PricingVersion (audit trail preserved)', async () => {
    const before = await PricingVersion.count();
    const result = await computeForSubmission(submissionId);
    expect(result.versionNumber).toBe(2);
    expect(await PricingVersion.count()).toBe(before + 1);
    const pricing = await Pricing.findOne({ where: { submissionId } });
    expect(pricing!.currentVersionNumber).toBe(2);
  });
});
