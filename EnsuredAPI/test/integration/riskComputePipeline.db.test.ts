/**
 * Slice 5.4 — RiskCompute pipeline-wiring REAL-DATABASE integration test.
 *
 * Proves the BACKEND half of Slice 5.4 end-to-end against Postgres:
 *   1. the wired RiskComputeService stage (the runner registered in board/service)
 *      persists a ModelRun + PricingVersion via the compute spine and returns the
 *      {ok:true} stage contract surfacing confidenceLabel / premium / ROL, and
 *   2. the board GET (GET /api/underwriting/submissions) ADDITIVELY surfaces the
 *      persisted provenance: confidenceLabel + premium for a benchmark case, and
 *      rateOnLine for a parametric case — while legacy fields are untouched.
 *
 * Requires Postgres on 127.0.0.1:5432 (see test/helpers/db.ts + globalSetup).
 * NOTE: the sandbox blocks the DB connection, so this is authored to be run by the
 * maintainer:
 *   nvm use 24 && npx jest test/integration/riskComputePipeline.db.test.ts
 */
import jwt from 'jsonwebtoken';
import { buildApp } from '../../src/app';
import { getSequelize } from '../../src/config/database';
import {
  CanonicalSubmission,
  InsurerProfile,
  ModelRun,
  Organization,
  PricingVersion,
  Submission,
} from '../../src/db/models';
import { User } from '../../src/db/models/identity.models';
import { BenchmarkPrior } from '../../src/db/models/benchmarkPrior.models';
import { initTestDb } from '../helpers/db';
import { upsertRegistry } from '../../src/pipeline/registry/upsert';
import { RiskComputeService } from '../../src/pipeline/riskCompute/service';

const BENCHMARK_LOB = 'property';
const PARAMETRIC_LOB = 'parametric_weather';
const PARAMETRIC_LIMIT = 5_000_000;

describe('RiskCompute pipeline wiring — real DB integration (Slice 5.4)', () => {
  jest.setTimeout(60000);

  let app: ReturnType<typeof buildApp>;
  let orgId: number;
  let token: string;
  let benchmarkSubmissionId: number;
  let parametricSubmissionId: number;

  beforeAll(async () => {
    await initTestDb();
    app = buildApp();
    await app.ready();

    const org = await Organization.create({ name: 'RiskCompute 5.4 Insurer', type: 'insurer' } as any);
    orgId = org.id;
    const insurer = await InsurerProfile.create({ organizationId: orgId, status: 'active' } as any);

    // An underwriter user so the board GET resolves this org.
    const user = await User.create({
      email: `uw.5.4.${org.id}@ensured.local`,
      organizationId: orgId,
      role: 'analyst',
      passwordHash: 'x',
      firstName: 'Risk',
      lastName: 'Analyst',
    } as any);
    const secret = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';
    token = jwt.sign({ userId: user.id }, secret);

    // ---- Benchmark (non-parametric) submission ----
    const benchmark = await Submission.create({
      tenantId: orgId,
      status: 'priced',
      insurerProfileId: insurer.id,
    } as any);
    benchmarkSubmissionId = benchmark.id;
    await CanonicalSubmission.create({
      submissionId: benchmarkSubmissionId,
      tenantId: orgId,
      data: { lineOfBusiness: BENCHMARK_LOB, 'financials.tiv': 1_000_000 },
      version: 1,
      lineOfBusinessCode: BENCHMARK_LOB,
      lineOfBusinessSubTypeCode: '',
    } as any);
    await BenchmarkPrior.create({
      organizationId: null,
      lineOfBusinessCode: BENCHMARK_LOB,
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
    await upsertRegistry({
      organizationId: orgId,
      lineOfBusinessCode: BENCHMARK_LOB,
      lineOfBusinessSubTypeCode: '',
      riskModelingMethod: 'generic_burning_cost',
      ratingMethod: 'generic_loss_ratio',
    });

    // ---- Parametric submission ----
    const parametric = await Submission.create({
      tenantId: orgId,
      status: 'priced',
      insurerProfileId: insurer.id,
    } as any);
    parametricSubmissionId = parametric.id;
    await CanonicalSubmission.create({
      submissionId: parametricSubmissionId,
      tenantId: orgId,
      data: {
        lineOfBusiness: PARAMETRIC_LOB,
        'financials.limit': PARAMETRIC_LIMIT,
        parametric: {
          indexName: 'wind',
          payoutFormula: 'min(limit,(wind-130)*125000)',
          probabilitySource: 'Structurer-cited HURDAT2 wind exceedance curve, 2024',
          exceedancePoints: [
            { indexValue: 140, annualExceedanceProbability: 0.05 },
            { indexValue: 160, annualExceedanceProbability: 0.02 },
            { indexValue: 200, annualExceedanceProbability: 0.005 },
          ],
        },
      },
      version: 1,
      lineOfBusinessCode: PARAMETRIC_LOB,
      lineOfBusinessSubTypeCode: '',
    } as any);
    await BenchmarkPrior.create({
      organizationId: null,
      lineOfBusinessCode: PARAMETRIC_LOB,
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
    await upsertRegistry({
      organizationId: orgId,
      lineOfBusinessCode: PARAMETRIC_LOB,
      lineOfBusinessSubTypeCode: '',
      riskModelingMethod: 'parametric_trigger',
      ratingMethod: 'parametric_premium',
    });
  }, 60000);

  afterAll(async () => {
    await app.close();
    await getSequelize().close();
  });

  it('the wired riskCompute stage persists + returns {ok:true} with provenance surfaced', async () => {
    const stage = new RiskComputeService();

    const benchmarkResult = await stage.process({
      submission: { id: benchmarkSubmissionId, tenantId: orgId },
    });
    expect(benchmarkResult.ok).toBe(true);
    expect(benchmarkResult.service).toBe('riskCompute');
    expect(benchmarkResult.confidenceLabel).toBe('benchmark_low');
    expect(Number(benchmarkResult.premium)).toBeCloseTo(6666.67, 1);
    expect(benchmarkResult.rateOnLine).toBeNull(); // non-parametric

    // It actually persisted (compute spine ran through the wrapper).
    const mr = await ModelRun.findByPk(Number(benchmarkResult.modelRunId));
    expect(mr).toBeTruthy();
    const pv = await PricingVersion.findByPk(Number(benchmarkResult.pricingVersionId));
    expect((pv!.assumptionsJson as any)?.confidenceLabel).toBe('benchmark_low');

    const parametricResult = await stage.process({
      submission: { id: parametricSubmissionId, tenantId: orgId },
    });
    expect(parametricResult.ok).toBe(true);
    expect(typeof parametricResult.rateOnLine).toBe('number'); // ROL surfaced
  });

  it('missing submission id ⇒ {ok:false, NO_SUBMISSION}; bad id ⇒ {ok:false} no throw', async () => {
    const noId = await new RiskComputeService().process({ submission: {} });
    expect(noId.ok).toBe(false);
    expect(noId.code).toBe('NO_SUBMISSION');

    const badId = await new RiskComputeService().process({ submission: { id: 99_999_999 } });
    expect(badId.ok).toBe(false); // submission_not_found, caught by runStage
    expect(badId.service).toBe('riskCompute');
  });

  it('board GET additively surfaces confidenceLabel + premium (benchmark) and rateOnLine (parametric)', async () => {
    // Ensure both submissions are computed/persisted before reading the board.
    await new RiskComputeService().process({ submission: { id: benchmarkSubmissionId, tenantId: orgId } });
    await new RiskComputeService().process({ submission: { id: parametricSubmissionId, tenantId: orgId } });

    const res = await app.inject({
      method: 'GET',
      url: '/api/underwriting/submissions',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as {
      items: Array<{ id: number; values: Record<string, unknown> }>;
    };

    const benchmarkItem = body.items.find((i) => i.id === benchmarkSubmissionId);
    expect(benchmarkItem).toBeTruthy();
    expect(benchmarkItem!.values.confidenceLabel).toBe('benchmark_low');
    expect(Number(benchmarkItem!.values.premium)).toBeCloseTo(6666.67, 1);
    expect(Number(benchmarkItem!.values.expectedLoss)).toBeCloseTo(4000, 2);
    expect(String(benchmarkItem!.values.priorSource)).toMatch(/NAIC/);
    // Legacy fields untouched.
    expect(benchmarkItem!.values.pricingVersion).toBeTruthy();
    expect(benchmarkItem!.values.submissionNumber).toBeDefined();

    const parametricItem = body.items.find((i) => i.id === parametricSubmissionId);
    expect(parametricItem).toBeTruthy();
    expect(typeof parametricItem!.values.rateOnLine).toBe('number');
  });
});
