/**
 * Slice 5.4 — RiskComputeService stage wrapper, DB-FREE unit tests.
 *
 * `computeForSubmission` is mocked so these tests run without Postgres. They prove
 * the stage's {ok}/{ok:false} contract + that it surfaces the board-relevant
 * provenance fields, and that it NEVER throws out of `process` (guarded by
 * runStage) — the founder's "never crash the pipeline advance" constraint.
 */
import { RiskComputeService } from './service';
import * as computeModule from '../compute/service';

jest.mock('../compute/service', () => ({
  computeForSubmission: jest.fn(),
}));

const mockedCompute = computeModule.computeForSubmission as jest.MockedFunction<
  typeof computeModule.computeForSubmission
>;

function makeComputeResult(overrides: Partial<computeModule.ComputeResult> = {}): computeModule.ComputeResult {
  return {
    submissionId: 42,
    modelRunId: 7,
    pricingId: 3,
    pricingVersionId: 11,
    versionNumber: 1,
    riskMetricId: null,
    expectedLoss: '4000.000000',
    var99: null,
    premium: '6666.670000',
    expectedReturn: '0.100000',
    riskScore: '0.600000',
    provenance: {
      method: { modeling: 'generic_burning_cost', rating: 'generic_loss_ratio' },
      resolvedFrom: 'generic_default' as any,
      priorResolvedFrom: 'platform_default' as any,
      priorSource: 'NAIC / III aggregate commercial property loss ratios',
      priorSourceUrl: 'https://www.iii.org/table-archive/21256',
      z: 0,
      confidenceLabel: 'benchmark_low' as any,
      inputs: {},
      blendDetail: { basis: 'prior_only' as any, experience: null, prior: 4000, blended: 4000 },
      modelDetail: {},
      pricingDetail: {},
      notModeled: ['var99'],
      flags: [],
      note: '',
      ...(overrides.provenance ?? {}),
    },
    ...overrides,
  } as computeModule.ComputeResult;
}

describe('RiskComputeService (Slice 5.4 stage wrapper)', () => {
  beforeEach(() => {
    mockedCompute.mockReset();
  });

  test('payload with submission.id ⇒ {ok:true} surfacing confidence/premium/expectedLoss', async () => {
    mockedCompute.mockResolvedValue(makeComputeResult());
    const result = await new RiskComputeService().process({ submission: { id: 42, organizationId: 1 } });

    expect(mockedCompute).toHaveBeenCalledWith(42);
    expect(result.ok).toBe(true);
    expect(result.service).toBe('riskCompute');
    expect(result.premium).toBe('6666.670000');
    expect(result.expectedLoss).toBe('4000.000000');
    expect(result.confidenceLabel).toBe('benchmark_low');
    expect(result.z).toBe(0);
    expect(result.modelRunId).toBe(7);
    expect(result.pricingVersionId).toBe(11);
    // Non-parametric ⇒ no parametric block ⇒ ROL null.
    expect(result.rateOnLine).toBeNull();
    expect(result.lossOnLine).toBeNull();
    expect(result.priorSource).toMatch(/NAIC/);
  });

  test('parametric submission ⇒ rateOnLine surfaced from provenance.parametric', async () => {
    mockedCompute.mockResolvedValue(
      makeComputeResult({
        provenance: {
          parametric: {
            modelable: true,
            reason: null,
            probabilitySource: 'USGS',
            indexName: 'PGA',
            bands: [],
            rateOnLine: 0.085,
            lossOnLine: 0.05,
            coverageLimit: 1_000_000,
            basisRisk: true,
            buildUp: null,
          },
        } as any,
      }),
    );
    const result = await new RiskComputeService().process({ submission: { id: 42 } });

    expect(result.ok).toBe(true);
    expect(result.rateOnLine).toBe(0.085);
    expect(result.lossOnLine).toBe(0.05);
  });

  test('missing submission id ⇒ {ok:false, NO_SUBMISSION} and compute not called', async () => {
    const result = await new RiskComputeService().process({ submission: {} });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('NO_SUBMISSION');
    expect(result.service).toBe('riskCompute');
    expect(mockedCompute).not.toHaveBeenCalled();
  });

  test('empty payload ⇒ {ok:false, NO_SUBMISSION}', async () => {
    const result = await new RiskComputeService().process({});
    expect(result.ok).toBe(false);
    expect(result.code).toBe('NO_SUBMISSION');
    expect(mockedCompute).not.toHaveBeenCalled();
  });

  test('non-numeric id ⇒ {ok:false, NO_SUBMISSION}', async () => {
    const result = await new RiskComputeService().process({ submission: { id: 'abc' } });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('NO_SUBMISSION');
    expect(mockedCompute).not.toHaveBeenCalled();
  });

  test('computeForSubmission throws ⇒ {ok:false} (never throws out)', async () => {
    mockedCompute.mockRejectedValue(new Error('submission_not_found'));
    const result = await new RiskComputeService().process({ submission: { id: 999 } });
    expect(result.ok).toBe(false);
    expect(result.service).toBe('riskCompute');
    expect(result.error).toBe('submission_not_found');
    // runStage default code.
    expect(result.code).toBe('STAGE_ERROR');
  });

  test('computeForSubmission throws a generic DB error ⇒ {ok:false} (no propagation)', async () => {
    mockedCompute.mockRejectedValue(new Error('write_failed'));
    await expect(
      new RiskComputeService().process({ submission: { id: 5 } }),
    ).resolves.toMatchObject({ ok: false, service: 'riskCompute' });
  });
});
