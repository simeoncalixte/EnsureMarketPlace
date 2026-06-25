/**
 * Slice 5.0 — RiskComputeService REAL-DATABASE integration test.
 *
 * Exercises the actual compute path against Postgres: seed a benchmark prior +
 * a submission + (optional) registry row → call computeForSubmission → assert a
 * ModelRun + PricingVersion are written with Z=0 benchmark provenance, var99 null,
 * premium present, and the citation captured; recompute → a NEW PricingVersion.
 *
 * Requires Postgres on 127.0.0.1:5432 (see test/helpers/db.ts + globalSetup).
 * NOTE: the sandbox blocks the DB connection, so this is authored to be run by the
 * maintainer (`nvm use 24 && npx jest test/integration/riskComputeSpine.db.test.ts`).
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

const LOB = 'property';

describe('RiskComputeService — real DB integration (Slice 5.0)', () => {
  (global as any).jest?.setTimeout?.(60000);

  let orgId: number;
  let submissionId: number;

  beforeAll(async () => {
    await initTestDb();
    const org = await Organization.create({ name: 'Compute Test Insurer', type: 'insurer' } as any);
    orgId = org.id;

    const submission = await Submission.create({ organizationId: org.id, status: 'analysis' } as any);
    submissionId = submission.id;

    // Canonical data carries the taxonomy code + a TIV exposure base.
    await CanonicalSubmission.create({
      submissionId,
      organizationId: org.id,
      data: { lineOfBusiness: LOB, 'financials.tiv': 1_000_000 },
      version: 1,
      lineOfBusinessCode: LOB,
      lineOfBusinessSubTypeCode: '',
    } as any);

    // A CITED platform-default benchmark prior for property.
    await BenchmarkPrior.create({
      organizationId: null,
      lineOfBusinessCode: LOB,
      lineOfBusinessSubTypeCode: '',
      exposureBasis: 'TIV',
      lossRate: '0.00400000',
      targetLossRatio: '0.600000',
      expenseRatio: '0.280000',
      marginTarget: '0.100000',
      fullCredibilityStandard: '1082.0000',
      paramsJson: {},
      source: 'NAIC / III aggregate commercial property loss ratios ~55-65%',
      sourceUrl: 'https://www.iii.org/table-archive/21256',
      asOfDate: '2024-12-31',
      status: 'active',
    } as any);

    // A registry row declaring the generic methods (resolver would default anyway).
    await upsertRegistry({
      organizationId: orgId,
      lineOfBusinessCode: LOB,
      lineOfBusinessSubTypeCode: '',
      riskModelingMethod: 'generic_burning_cost',
      ratingMethod: 'generic_loss_ratio',
    });
  }, 60000);

  afterAll(async () => {
    await getSequelize().close();
  });

  it('computes + persists a ModelRun and PricingVersion with Z=0 benchmark provenance', async () => {
    const result = await computeForSubmission(submissionId);

    // Loss cost = exposureBase (1,000,000) × lossRate (0.004) = 4,000.
    expect(Number(result.expectedLoss)).toBeCloseTo(4000, 2);
    // Premium = expectedLoss / targetLossRatio = 4000 / 0.6 ≈ 6666.67.
    expect(Number(result.premium)).toBeCloseTo(6666.67, 1);

    // var99 stays NULL (not modeled until the cat engine, 5.2).
    expect(result.var99).toBeNull();
    expect(result.provenance.notModeled).toContain('var99');

    // Z=0 today (no internal experience) → benchmark_low confidence.
    expect(result.provenance.z).toBe(0);
    expect(result.provenance.confidenceLabel).toBe('benchmark_low');
    expect(result.provenance.blendDetail.basis).toBe('prior_only');

    // Citation captured.
    expect(result.provenance.priorSource).toMatch(/NAIC/);

    // expectedReturn derived from marginTarget (0.1), NOT the old constant.
    expect(Number(result.expectedReturn)).toBeCloseTo(0.1, 6);
    expect(result.expectedReturn).not.toBe('0.1280');
    // riskScore = implied loss ratio 4000/6666.67 ≈ 0.6, NOT the old constant.
    expect(Number(result.riskScore)).toBeCloseTo(0.6, 2);
    expect(result.riskScore).not.toBe('0.6120');

    // ModelRun row written with provenance + null var99.
    const modelRun = await ModelRun.findByPk(result.modelRunId);
    expect(modelRun).toBeTruthy();
    expect(modelRun!.var99).toBeNull();
    expect((modelRun!.parametersJson as any)?.priorSource).toMatch(/NAIC/);
    expect((modelRun!.parametersJson as any)?.notModeled).toContain('var99');

    // PricingVersion row written at version 1 with provenance.
    expect(result.versionNumber).toBe(1);
    const pv = await PricingVersion.findByPk(result.pricingVersionId);
    expect(pv).toBeTruthy();
    expect((pv!.assumptionsJson as any)?.z).toBe(0);
    expect((pv!.assumptionsJson as any)?.priorSource).toMatch(/NAIC/);
  });

  it('recompute creates a NEW PricingVersion (audit trail preserved)', async () => {
    const before = await PricingVersion.count();
    const result = await computeForSubmission(submissionId);

    expect(result.versionNumber).toBe(2);
    const after = await PricingVersion.count();
    expect(after).toBe(before + 1);

    const pricing = await Pricing.findOne({ where: { submissionId } });
    expect(pricing!.currentVersionNumber).toBe(2);
  });
});
