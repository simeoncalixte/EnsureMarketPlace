import { runStage } from '../stageResult';
import { computeForSubmission } from '../compute/service';

/**
 * Slice 5.4 — RiskComputeService: the PIPELINE STAGE WRAPPER around the existing
 * `computeForSubmission` compute spine (Slice 5.0/5.1).
 *
 * The compute spine already resolves the risk class, runs the modeling + rating
 * strategies, applies the credibility blend, and PERSISTS a ModelRun + a new
 * PricingVersion (and a RiskMetric when a Deal exists). It is total/safe (throws
 * only on `submission_not_found`).
 *
 * This stage does NOT re-implement any of that. It is a thin, TOTAL adapter that:
 *   1. extracts `payload.submission.id` (the inputPayload shape the board builds),
 *   2. calls `computeForSubmission(id)`,
 *   3. returns the platform `{ ok, service, ... }` stage contract via `runStage`,
 *      surfacing the board-relevant numbers + provenance (confidence / Z / ROL).
 *
 * GUARANTEES (founder constraint: never crash the pipeline advance):
 *   - No submission id in the payload ⇒ `{ ok:false, code:'NO_SUBMISSION' }`.
 *   - `computeForSubmission` throwing (incl. `submission_not_found`) ⇒ `runStage`
 *     converts it to `{ ok:false, service:'riskCompute', error, code }` — it never
 *     propagates out of `process`.
 *   - It does NOT modify `computeForSubmission` or any Slice 1-5.1 logic; it is
 *     purely additive and read-through.
 */

const SERVICE = 'riskCompute';
const NO_SUBMISSION_CODE = 'NO_SUBMISSION';

function toRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, any>;
}

export class RiskComputeService {
  async process(payload: unknown): Promise<Record<string, unknown>> {
    return runStage(SERVICE, () => this.runRiskCompute(payload));
  }

  private async runRiskCompute(payload: unknown): Promise<Record<string, unknown>> {
    const submission = toRecord(toRecord(payload).submission);
    const rawId = submission.id;
    const submissionId = Number(rawId);

    // Guard: the board builds `inputPayload.submission = { id, tenantId }`; if no
    // usable id arrives we report a structured failure rather than calling compute
    // with NaN (which would surface as submission_not_found anyway).
    if (rawId == null || !Number.isFinite(submissionId)) {
      return {
        ok: false,
        service: SERVICE,
        error: 'no submission id in payload',
        code: NO_SUBMISSION_CODE,
      };
    }

    const result = await computeForSubmission(submissionId);
    const provenance = result.provenance;

    return {
      ok: true,
      service: SERVICE,
      submissionId: result.submissionId,
      modelRunId: result.modelRunId,
      pricingId: result.pricingId,
      pricingVersionId: result.pricingVersionId,
      versionNumber: result.versionNumber,
      riskMetricId: result.riskMetricId,
      premium: result.premium,
      expectedLoss: result.expectedLoss,
      expectedReturn: result.expectedReturn,
      riskScore: result.riskScore,
      var99: result.var99,
      confidenceLabel: provenance.confidenceLabel,
      z: provenance.z,
      method: provenance.method,
      priorSource: provenance.priorSource,
      priorSourceUrl: provenance.priorSourceUrl,
      // Parametric (Slice 5.1) is method-scoped: ROL/LOL are only present for
      // parametric_trigger submissions, otherwise null (provenance.parametric is
      // undefined for every other method).
      rateOnLine: provenance.parametric?.rateOnLine ?? null,
      lossOnLine: provenance.parametric?.lossOnLine ?? null,
    };
  }
}
