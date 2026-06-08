import { runStage } from '../stageResult';

function toRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, any>;
}

function parseRiskType(normalized: Record<string, any>, extracted: Record<string, any>): string {
  const raw = String(normalized.riskType ?? normalized.perilType ?? extracted.riskType ?? extracted.perilType ?? '').trim().toLowerCase();
  return raw || 'unknown';
}

function parseExpectedYield(normalized: Record<string, any>, extracted: Record<string, any>): number {
  const raw = Number(normalized.expectedYield ?? extracted.expectedYield ?? 0);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw > 1 ? raw / 100 : raw;
}

function gradeForScore(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D+';
  return 'D';
}

export class PreRatingService {
  async process(payload: any): Promise<Record<string, unknown>> {
    return runStage('preRating', () => this.runPreRating(payload));
  }

  private async runPreRating(payload: any): Promise<Record<string, unknown>> {
    const normalization = toRecord(payload?.normalization);
    const validation = toRecord(payload?.validation);
    const normalized = toRecord(normalization.normalized ?? normalization.data ?? {});
    const extraction = toRecord(payload?.extraction?.structuredData ?? payload?.extraction ?? {});

    const riskType = parseRiskType(normalized, extraction);
    const expectedYield = parseExpectedYield(normalized, extraction);

    // Appetite is owned by the validation stage's appetite engine
    // (OrganizationAppetiteProfile + taxonomy). preRating CONSUMES that single,
    // org-configured decision (passed forward in `validation.appetite`) instead of
    // re-deriving its own — there is no hardcoded peril list here. This keeps one
    // source of truth for "what risk do we want?" across the pipeline.
    const appetite = toRecord(validation.appetite);
    const appetiteDecision = typeof appetite.decision === 'string' ? appetite.decision : null;

    let score = 55;
    const reasons: string[] = [];

    if (appetiteDecision === 'IN_APPETITE') {
      score += 18;
      reasons.push('Risk is within the configured underwriting appetite');
    } else if (appetiteDecision === 'OUT_OF_APPETITE') {
      score -= 30;
      reasons.push('Risk is outside the configured underwriting appetite');
    } else if (appetiteDecision === 'FLAGGED') {
      score -= 6;
      reasons.push('Risk flagged by the underwriting appetite engine');
    } else {
      reasons.push('No appetite decision available (no profile configured)');
    }

    if (expectedYield >= 0.08) {
      score += 10;
      reasons.push('Expected yield exceeds target floor');
    } else if (expectedYield > 0) {
      score += 3;
      reasons.push('Expected yield available but below target floor');
    }

    if (validation.flaggedForMoreInfo) {
      score -= 30;
      reasons.push('Validation requires additional information');
    } else {
      score += 8;
      reasons.push('Validation passed auto-scrub checks');
    }

    score = Math.max(0, Math.min(100, Math.round(score)));
    const grade = gradeForScore(score);
    const priorityRank = Math.max(1, 101 - score);

    return {
      ok: true,
      service: 'preRating',
      model: 'heuristic-prerating-v1',
      grade,
      numericScore: score,
      riskType,
      expectedYield,
      priorityRank,
      reasons,
    };
  }
}
