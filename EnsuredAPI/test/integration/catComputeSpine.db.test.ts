/**
 * Slice 5.2 — Catastrophe compute path REAL-DATABASE integration test.
 *
 * Mirrors riskComputeSpine.db.test.ts. Two scenarios against Postgres:
 *
 *  1. MODELED: a catastrophe_property submission with data.exposures[] + a CITED
 *     event set (data.catEventSet) → computeForSubmission → ModelRun has AAL
 *     (expectedLoss), a POPULATED var99 (= 1-in-100 AEP), and outputJson with the
 *     EP curve + accumulation. provenance.cat.modelable === true.
 *
 *  2. DEFER: a catastrophe_property submission with NO event set → the cat strategy
 *     defers (expectedLossCost null) → compute falls back to the catastrophe_property
 *     benchmark prior (expectedLoss from prior loss rate × TIV), var99 stays NULL.
 *
 * Requires Postgres on 127.0.0.1:5432 (see test/helpers/db.ts + globalSetup). The
 * sandbox blocks the DB connection, so this is authored to be run by the maintainer:
 *   nvm use 24 && npx jest test/integration/catComputeSpine.db.test.ts --runInBand
 */
import { getSequelize } from '../../src/config/database';
import {
  CanonicalSubmission,
  ModelRun,
  Organization,
  Submission,
} from '../../src/db/models';
import { BenchmarkPrior } from '../../src/db/models/benchmarkPrior.models';
import { initTestDb } from '../helpers/db';
import { upsertRegistry } from '../../src/pipeline/registry/upsert';
import { computeForSubmission } from '../../src/pipeline/compute/service';
import { CITED_DEFAULT_DAMAGE_CURVE_SET } from '../../src/pipeline/catastrophe/damageCurves';
import { SAMPLE_FLORIDA_WIND_EVENT_SET } from '../../src/db/seed-data/catEventSet';

const LOB = 'catastrophe_property';

describe('Catastrophe compute path — real DB integration (Slice 5.2)', () => {
  (global as any).jest?.setTimeout?.(120000);

  let orgId: number;

  beforeAll(async () => {
    await initTestDb();
    const org = await Organization.create({ name: 'Cat Test Insurer', type: 'insurer' } as any);
    orgId = org.id;

    // Platform-default catastrophe_property benchmark prior (the DEFER fallback).
    // Loss rate 0.008 of TIV; carries the cited default damage curves on paramsJson.
    await BenchmarkPrior.create({
      organizationId: null,
      lineOfBusinessCode: LOB,
      lineOfBusinessSubTypeCode: '',
      exposureBasis: 'TIV',
      lossRate: '0.00800000',
      targetLossRatio: '0.550000',
      expenseRatio: '0.250000',
      marginTarget: '0.150000',
      fullCredibilityStandard: '1082.0000',
      paramsJson: { damageCurveSet: CITED_DEFAULT_DAMAGE_CURVE_SET },
      source: 'Cat-exposed property anchor (III/NAIC cat-year loss ratios).',
      sourceUrl: 'https://www.iii.org/fact-statistic/facts-statistics-us-catastrophes',
      asOfDate: '2024-12-31',
      status: 'active',
    } as any);

    // Platform-default registry row: cat_exposure modeling, generic rating.
    await upsertRegistry({
      organizationId: null,
      lineOfBusinessCode: LOB,
      lineOfBusinessSubTypeCode: '',
      riskModelingMethod: 'cat_exposure',
      ratingMethod: 'generic_loss_ratio',
    });
  }, 120000);

  afterAll(async () => {
    await getSequelize().close();
  });

  it('MODELED: AAL expectedLoss + populated var99 + EP curve + accumulation', async () => {
    const submission = await Submission.create({ organizationId: orgId, status: 'analysis' } as any);
    // Exposures + a CITED event set ride freeform on canonical data.
    await CanonicalSubmission.create({
      submissionId: submission.id,
      organizationId: orgId,
      data: {
        lineOfBusiness: LOB,
        catEventSet: SAMPLE_FLORIDA_WIND_EVENT_SET,
        exposures: [
          { tiv: 5_000_000, latitude: 25.77, longitude: -80.19, construction: 'wood', occupancy: 'residential' },
          { tiv: 8_000_000, latitude: 26.12, longitude: -80.14, construction: 'masonry', occupancy: 'commercial' },
        ],
      },
      version: 1,
      lineOfBusinessCode: LOB,
      lineOfBusinessSubTypeCode: '',
    } as any);

    const result = await computeForSubmission(submission.id);

    // AAL is a real modeled number (> 0) and is the expectedLoss.
    expect(result.expectedLoss).not.toBeNull();
    expect(Number(result.expectedLoss)).toBeGreaterThan(0);

    // var99 is POPULATED (= 1-in-100 AEP) for a modeled cat run.
    expect(result.var99).not.toBeNull();
    expect(Number(result.var99)).toBeGreaterThan(0);

    // Provenance cat block present + modelable; sources cited.
    expect(result.provenance.cat).toBeTruthy();
    expect(result.provenance.cat!.modelable).toBe(true);
    expect(result.provenance.cat!.eventSetSource).toMatch(/Florida|NHC|landfall/i);
    expect(result.provenance.cat!.var99Mapping.metric).toBe('1in100_AEP_annual_aggregate');
    expect(result.provenance.notModeled).not.toContain('var99');

    // ModelRun row: var99 populated, outputJson has the EP curve + accumulation.
    const modelRun = await ModelRun.findByPk(result.modelRunId);
    expect(modelRun!.var99).not.toBeNull();
    const out = modelRun!.outputJson as any;
    expect(out.cat).toBeTruthy();
    expect(out.cat.epCurve).toBeTruthy();
    expect(out.cat.accumulationByZone).toBeTruthy();
  });

  it('DEFER: no event set ⇒ falls back to benchmark prior, var99 NULL', async () => {
    const submission = await Submission.create({ organizationId: orgId, status: 'analysis' } as any);
    await CanonicalSubmission.create({
      submissionId: submission.id,
      organizationId: orgId,
      data: {
        lineOfBusiness: LOB,
        'financials.tiv': 10_000_000,
        // NO catEventSet → cat strategy defers → benchmark prior fallback.
        exposures: [
          { tiv: 10_000_000, latitude: 25.77, longitude: -80.19, construction: 'wood', occupancy: 'residential' },
        ],
      },
      version: 1,
      lineOfBusinessCode: LOB,
      lineOfBusinessSubTypeCode: '',
    } as any);

    const result = await computeForSubmission(submission.id);

    // expectedLoss comes from the benchmark prior: TIV 10M × lossRate 0.008 = 80,000.
    expect(Number(result.expectedLoss)).toBeCloseTo(80_000, 0);

    // var99 stays NULL on a deferred cat run (never fabricated).
    expect(result.var99).toBeNull();
    expect(result.provenance.notModeled).toContain('var99');

    // cat provenance present but modelable=false with a defer reason.
    expect(result.provenance.cat!.modelable).toBe(false);
    expect(result.provenance.cat!.reason).toBe('no_cited_event_set');
    expect(result.provenance.flags.some((f) => f.startsWith('cat:deferred_'))).toBe(true);
  });
});
