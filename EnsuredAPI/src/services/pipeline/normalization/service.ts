import { SubmissionOutput } from '../../../db/models';
import { runStage } from '../stageResult';
import { canonicalizeAndPin } from '../canonicalize/service';

function toRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, any>;
}

export class NormalizationService {
  async process(payload: any): Promise<Record<string, unknown>> {
    return runStage('normalization', () => this.runNormalization(payload));
  }

  private async runNormalization(payload: any): Promise<Record<string, unknown>> {
    const extraction = toRecord(payload?.extraction?.structuredData ?? payload?.extraction ?? {});

    const normalized: Record<string, any> = {
      ...extraction,
      source: 'normalization',
      normalizedAt: new Date().toISOString(),
    };

    // Carry the classification stage's line-of-business into the canonical data.
    // Extraction-provided values win; classification only fills the gaps, and an
    // explicit "unclassified" abstention is never stamped.
    const classification = toRecord(payload?.classification);
    const lobFromClassification: Record<string, unknown> = {
      lineOfBusiness: classification.lineOfBusinessLabel,
      lineOfBusinessCode: classification.lineOfBusinessCode,
      lineOfBusinessSubTypeCode: classification.lineOfBusinessSubTypeCode,
    };
    for (const [key, value] of Object.entries(lobFromClassification)) {
      if (normalized[key] != null) continue;
      if (typeof value !== 'string' || value.length === 0) continue;
      if (value.toLowerCase() === 'unclassified') continue;
      normalized[key] = value;
    }

    const submission = payload?.submission;
    if (submission?.id) {
      const submissionId = Number(submission.id);
      let doc = await SubmissionOutput.findOne({ where: { submissionId } });
      if (!doc) {
        doc = await SubmissionOutput.create({
          submissionId,
          organizationId: submission.organizationId ?? null,
          structuredData: { normalization: normalized },
        });
      } else {
        const existing = (doc.structuredData ?? {}) as Record<string, unknown>;
        const existingNormalization = (existing.normalization ?? {}) as Record<string, unknown>;
        doc.structuredData = {
          ...existing,
          normalization: { ...existingNormalization, ...normalized },
        };
        await doc.save();
      }

      // --- Slice 3: pin submission on canonicalization + opt-in enforcement ---
      // STRICT NO-OP for any org without a published schema for this risk class:
      // when nothing resolves, `canonicalizeAndPin` writes the canonical row with a
      // NULL pin and runs no validation, leaving this stage's output identical to
      // before. The ONLY behavior change is the intended opt-in enforcement: a
      // genuinely pinned submission whose data fails its schema → {ok:false}.
      const enforcementFailure = await this.pinAndEnforce(submissionId, submission?.organizationId ?? null, normalized);
      if (enforcementFailure) {
        return enforcementFailure;
      }
    }

    return {
      ok: true,
      service: 'normalization',
      normalized: extraction,
      data: extraction,
      received: payload,
    };
  }

  /**
   * Additive, gated canonicalization-pin step. Returns a `{ok:false}` stage result
   * ONLY when a pinned schema's enforcement fails; returns null in every other case
   * so the existing happy path is preserved exactly.
   *
   * NON-DEGRADATION: this is the first slice to touch the live pipeline, and it
   * introduces the first-ever write to `CanonicalSubmission`. To honor the
   * "enhance, never degrade" rule, the ENTIRE step (including the new DB write) is
   * best-effort — any thrown error degrades to "skip" and returns null, so a
   * submission that normalized successfully before can NEVER be turned into a stage
   * failure by this addition. The only new failure mode is the intended, opt-in
   * enforcement: a genuinely pinned submission whose data fails its schema. (When a
   * later consumer depends on canonical persistence, harden the write then.)
   */
  private async pinAndEnforce(
    submissionId: number,
    organizationId: number | null,
    normalized: Record<string, any>,
  ): Promise<Record<string, unknown> | null> {
    let outcome;
    try {
      outcome = await canonicalizeAndPin({
        submissionId,
        organizationId,
        data: normalized,
      });
    } catch (err) {
      // A genuine DB/write failure in the new canonical step must not convert a
      // previously-passing normalization into a failure. Degrade to no-op.
      console.warn(
        `[normalization] canonicalize/pin skipped for submission ${submissionId} (best-effort):`,
        err instanceof Error ? err.message : err,
      );
      return null;
    }

    if (outcome.status === 'enforcement_failed') {
      return {
        ok: false,
        service: 'normalization',
        error: 'Canonical data failed pinned schema validation',
        code: 'SCHEMA_VALIDATION_FAILED',
        schemaVersionId: outcome.schemaVersionId,
        validationErrors: outcome.errors,
      };
    }

    return null;
  }
}
