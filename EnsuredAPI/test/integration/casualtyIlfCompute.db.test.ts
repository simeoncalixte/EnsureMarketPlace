/**
 * Slice 5.3 — Casualty ILF compute + coverage REAL-DATABASE integration test.
 *
 * Seeds the platform-default benchmark priors (the cited tranche) + the
 * platform-default casualty registry rows (ratingMethod=casualty_ilf), creates a
 * casualty submission with a coverage limit, and asserts:
 *   1. computeForSubmission applies the ILF factor to the technical premium, and
 *      the casualty provenance records ilfApplied + the factor.
 *   2. the coverage pure function (run against the live seeded platform rows)
 *      reports the seeded tranche lines as covered.
 *
 * Requires Postgres on 127.0.0.1:5432 (see test/helpers/db.ts + globalSetup).
 * Run: nvm use 24 && npx jest test/integration/casualtyIlfCompute.db.test.ts --runInBand
 */
import { getSequelize } from '../../src/config/database';
import {
  CanonicalSubmission,
  LineOfBusinessPrimaryType,
  Organization,
  Submission,
} from '../../src/db/models';
import { BenchmarkPrior } from '../../src/db/models/benchmarkPrior.models';
import { initTestDb } from '../helpers/db';
import { computeForSubmission } from '../../src/pipeline/compute/service';
import { seedBenchmarkPriors } from '../../src/pipeline/benchmarkPriors/seed';
import { seedCasualtyRegistryRows } from '../../src/pipeline/registry/seed';
import { upsertRegistry } from '../../src/pipeline/registry/upsert';
import { lineOfBusinessTaxonomy } from '../../src/db/seed-data/lineOfBusinessTaxonomy';
import { computeCoverage } from '../../src/pipeline/benchmarkPriors/coverage';

const LOB = 'professional_liability';
const LIMIT = 2_000_000; // ILF(2M) / ILF(1M) = 1.5 / 1.0 = 1.5 on the seeded curve.

describe('Casualty ILF compute + coverage — real DB integration (Slice 5.3)', () => {
  (global as any).jest?.setTimeout?.(60000);

  let orgId: number;
  let submissionId: number;

  beforeAll(async () => {
    await initTestDb();

    // Seed the primary taxonomy lines (needed by the coverage report).
    await LineOfBusinessPrimaryType.bulkCreate(
      lineOfBusinessTaxonomy.map((p, i) => ({ code: p.code, label: p.label, sortOrder: i, isActive: true })) as any,
    );

    // Fuel the credibility machinery via the SAME idempotent seeders the server uses.
    await seedBenchmarkPriors();
    await seedCasualtyRegistryRows();

    const org = await Organization.create({ name: 'Casualty Test Insurer', type: 'insurer' } as any);
    orgId = org.id;

    // The platform prof-liability prior intentionally has NO flat lossRate (revenue
    // basis), so the generic burning-cost model would produce no loss cost. To
    // exercise the ILF on a non-null premium we give THIS org a registry
    // methodParams.lossRate (the existing registry override path) → loss cost =
    // revenue (5M) × 0.002 = 10,000. ratingMethod stays casualty_ilf.
    await upsertRegistry({
      organizationId: orgId,
      lineOfBusinessCode: LOB,
      lineOfBusinessSubTypeCode: '',
      riskModelingMethod: 'generic_burning_cost',
      ratingMethod: 'casualty_ilf',
      methodParamsJson: { lossRate: 0.002 },
    });

    const submission = await Submission.create({ tenantId: org.id, status: 'analysis' } as any);
    submissionId = submission.id;

    // Casualty canonical data: revenue exposure base + the coverage limit.
    await CanonicalSubmission.create({
      submissionId,
      tenantId: org.id,
      data: { lineOfBusiness: LOB, 'financials.revenue': 5_000_000, 'financials.limit': LIMIT },
      version: 1,
      lineOfBusinessCode: LOB,
      lineOfBusinessSubTypeCode: '',
    } as any);
  }, 60000);

  afterAll(async () => {
    await getSequelize().close();
  });

  it('applies the ILF factor (1.5 at 2M) to the technical premium with full provenance', async () => {
    const result = await computeForSubmission(submissionId);

    // The casualty_ilf rating method was selected from the platform registry row.
    expect(result.provenance.method.rating).toBe('casualty_ilf');
    expect(result.provenance.casualty).toBeTruthy();
    expect(result.provenance.casualty!.ilfApplied).toBe(true);
    expect(result.provenance.casualty!.ilfFactor).toBeCloseTo(1.5, 6);
    expect(result.provenance.casualty!.basisLimit).toBe(1_000_000);
    expect(result.provenance.casualty!.coverageLimit).toBe(LIMIT);

    // Loss cost = revenue (5M) × registry lossRate (0.002) = 10,000.
    expect(Number(result.expectedLoss)).toBeCloseTo(10_000, 2);

    // Base premium uses the load build-up (prior carries expense 0.30 + margin 0.10):
    //   base = 10,000 / (1 - 0.30 - 0.10) = 10,000 / 0.60 = 16,666.67
    // ILF(2M)/ILF(1M) = 1.5 → technical premium = 16,666.67 × 1.5 = 25,000.
    expect(Number(result.premium)).toBeCloseTo(25_000, 0);
    expect(result.provenance.casualty!.buildUp).toBe('load_buildup');
    expect(result.provenance.casualty!.rateOnLine).toBeCloseTo(25_000 / LIMIT, 6);
    expect(result.provenance.casualty!.lossOnLine).toBeCloseTo(10_000 / LIMIT, 6);

    // Citation captured.
    expect(result.provenance.priorSource).toMatch(/professional|NAIC|liability/i);

    // var99 still NULL (not modeled until the cat engine, 5.2).
    expect(result.var99).toBeNull();
  });

  it('coverage report marks the seeded tranche casualty + property lines as covered', async () => {
    const priors = await BenchmarkPrior.findAll({ where: { organizationId: null, status: 'active' } });
    const rows = priors.map((p) => {
      const json = p.toJSON() as any;
      const num = (v: any) => (v == null ? null : Number(v));
      return {
        id: p.id,
        organizationId: p.organizationId,
        lineOfBusinessCode: p.lineOfBusinessCode,
        lineOfBusinessSubTypeCode: p.lineOfBusinessSubTypeCode,
        exposureBasis: p.exposureBasis ?? null,
        lossRate: num(json.lossRate),
        targetLossRatio: num(json.targetLossRatio),
        expenseRatio: num(json.expenseRatio),
        marginTarget: num(json.marginTarget),
        fullCredibilityStandard: num(json.fullCredibilityStandard),
        paramsJson: (p.paramsJson as any) ?? {},
        source: p.source,
        sourceUrl: p.sourceUrl ?? null,
        asOfDate: p.asOfDate ?? null,
        status: p.status,
      };
    });

    const lines = computeCoverage(
      lineOfBusinessTaxonomy.map((p) => ({ code: p.code, label: p.label })),
      rows,
    );

    const covered = new Set(lines.filter((l) => l.hasPlatformPrior).map((l) => l.code));
    expect(covered.has('professional_liability')).toBe(true);
    expect(covered.has('directors_officers')).toBe(true);
    expect(covered.has('cyber')).toBe(true);
    expect(covered.has('commercial_property')).toBe(true);
    expect(covered.has('workers_compensation')).toBe(true);
    // A line with no seeded prior remains uncovered.
    expect(covered.has('farm_ranch')).toBe(false);

    const profLine = lines.find((l) => l.code === 'professional_liability')!;
    expect(profLine.source).toMatch(/NAIC|professional|liability/i);
  });
});
