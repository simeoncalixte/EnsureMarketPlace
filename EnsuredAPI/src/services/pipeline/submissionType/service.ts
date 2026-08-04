import { Submission, SubmissionOutput } from '../../../db/models';
import { submissionTypeTaxonomy } from '../../../db/seed-data/submissionTypeTaxonomy';
import { runStage } from '../stageResult';
import { buildCanonicalView } from '../canonicalView';
import {
  GeminiSubmissionTypeAgent,
  SubmissionTypeAgent,
  SubmissionTypeInput,
  unknownSubmissionTypeResult,
} from './GeminiSubmissionTypeProvider';

/**
 * The transaction/intake type of a submission — a dimension distinct from the
 * line of business. Determined right after OCR so the rest of the pipeline knows
 * whether it is handling a new-business risk, a renewal, an endorsement, a claim,
 * a cancellation, or a reinsurance treaty/facultative placement.
 */
export type SubmissionTypeClassification = {
  modelVersion: string;
  submissionTypeCode: string;
  submissionTypeLabel: string;
  submissionSubTypeCode: string | null;
  submissionSubTypeLabel: string | null;
  confidence: number;
  needsReview: boolean;
  evidence: string[];
  alternatives: Array<{
    submissionTypeCode: string;
    submissionTypeLabel: string;
    score: number;
  }>;
};

type TypeCandidate = {
  code: string;
  label: string;
  keywords: string[];
  subTypes: Array<{
    code: string;
    label: string;
    keywords: string[];
  }>;
};

type PendingDocument = SubmissionOutput & { submission?: Submission | null };

const MODEL_VERSION = 'subtype-keyword-taxonomy-v1';

const candidates: TypeCandidate[] = submissionTypeTaxonomy.map((primary) => ({
  code: primary.code,
  label: primary.label,
  keywords: [
    primary.label,
    primary.code.replace(/_/g, ' '),
    ...domainKeywordsFor(primary.code),
  ],
  subTypes: primary.subTypes.map((subType) => ({
    code: subType.code,
    label: subType.label,
    keywords: [
      subType.label,
      subType.code.replace(primary.code, '').replace(/_/g, ' '),
      ...domainKeywordsFor(subType.code),
    ],
  })),
}));

function domainKeywordsFor(code: string): string[] {
  const dictionary: Record<string, string[]> = {
    new_business: ['new business', 'new submission', 'request to quote', 'new account', 'application for insurance', 'newly formed', 'bind request', 'effective date'],
    new_business_broker_submission: ['broker submission', 'on behalf of our client', 'placing broker'],
    new_business_mga_binder: ['mga', 'managing general agent', 'binding authority', 'binder agreement'],
    renewal: ['renewal', 'renew', 'expiring policy', 'expiring program', 'renewal terms', 'anniversary date', 'continuation of coverage'],
    renewal_repriced: ['repriced', 'rate increase', 'rate change at renewal'],
    renewal_remarketed: ['remarket', 'remarketed', 'shopping the renewal'],
    quote_request: ['quote', 'quotation', 'pricing request', 'rate request', 'please quote'],
    quote_request_indication: ['indication', 'budget number', 'ballpark'],
    quote_request_firm_quote: ['firm quote', 'bindable quote', 'firm order terms'],
    endorsement: ['endorsement', 'mid-term', 'midterm change', 'amendment', 'policy change', 'amend the policy', 'change request', 'effective date of change'],
    endorsement_add_location: ['add location', 'additional location', 'add exposure', 'newly acquired location'],
    endorsement_remove_location: ['remove location', 'delete location', 'remove exposure'],
    endorsement_change_limit: ['increase limit', 'decrease limit', 'limit change', 'deductible change', 'change the limit'],
    endorsement_named_insured: ['named insured change', 'add named insured', 'additional insured', 'add insured'],
    endorsement_coverage_change: ['add coverage', 'delete coverage', 'coverage change'],
    cancellation: ['cancellation', 'cancel the policy', 'notice of cancellation', 'flat cancel', 'rescind coverage', 'terminate the policy', 'pro rata cancel'],
    cancellation_non_payment: ['non-payment', 'non payment', 'failure to pay', 'past due premium'],
    cancellation_insured_request: ['insured request', 'requested cancellation', 'no longer require coverage'],
    claim: ['claim', 'loss notice', 'notice of loss', 'date of loss', 'claimant', 'adjuster', 'reported loss', 'incident occurred'],
    claim_first_notice_of_loss: ['first notice of loss', 'fnol', 'notice of loss'],
    claim_claim_update: ['claim update', 'claim status', 'reserve change'],
    claim_loss_run: ['loss run', 'loss runs', 'loss history', 'loss experience'],
    claim_subrogation: ['subrogation', 'subrogated', 'recovery against'],
    audit: ['premium audit', 'final audit', 'audit period', 'audited exposures'],
    audit_payroll: ['payroll audit', 'audited payroll'],
    audit_exposure: ['exposure audit', 'audited sales', 'audited receipts'],
    treaty_reinsurance: ['treaty', 'reinsurance treaty', 'cession', 'ceding company', 'cedant', 'reinsurance program', 'whole book', 'underlying portfolio'],
    treaty_reinsurance_quota_share: ['quota share', 'proportional treaty', 'cede a percentage'],
    treaty_reinsurance_surplus: ['surplus share', 'surplus treaty', 'lines treaty'],
    treaty_reinsurance_excess_of_loss: ['excess of loss', 'cat xol', 'catastrophe excess', 'per occurrence excess', 'working layer'],
    treaty_reinsurance_stop_loss: ['stop loss', 'aggregate stop loss', 'loss ratio cap'],
    facultative_reinsurance: ['facultative', 'fac certificate', 'fac placement', 'facultative reinsurance', 'single risk cession', 'cede this risk'],
    facultative_reinsurance_proportional: ['proportional facultative', 'fac quota share'],
    facultative_reinsurance_excess_of_loss: ['facultative excess', 'fac excess of loss'],
    inquiry: ['inquiry', 'general inquiry', 'information request', 'please advise', 'question regarding'],
    inquiry_document_request: ['document request', 'please send', 'copy of the policy'],
  };

  return dictionary[code] ?? [];
}

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9.%/$\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function keywordWeight(keyword: string): number {
  const words = keyword.trim().split(/\s+/).filter(Boolean).length;
  if (words >= 3) return 5;
  if (words === 2) return 4;
  return 3;
}

function scoreKeywords(text: string, keywords: string[]): { score: number; evidence: string[] } {
  return keywords.reduce(
    (acc, keyword) => {
      const normalizedKeyword = normalizeText(keyword);
      if (!normalizedKeyword) return acc;
      if (text.includes(normalizedKeyword)) {
        acc.score += keywordWeight(normalizedKeyword);
        acc.evidence.push(keyword);
      }
      return acc;
    },
    { score: 0, evidence: [] as string[] },
  );
}

function confidenceFromScores(topScore: number, runnerUpScore: number): number {
  if (topScore <= 0) return 0.35;
  const separation = Math.max(0, topScore - runnerUpScore);
  const confidence = 0.52 + Math.min(0.28, topScore / 50) + Math.min(0.18, separation / 30);
  return Math.min(0.98, Math.round(confidence * 100) / 100);
}

/**
 * Free keyword-taxonomy heuristic for the submission/transaction type. Mirrors
 * the LOB classifier's scoring so the two stages behave consistently: it abstains
 * (returns the explicit `unknown` result) rather than fabricating a default when
 * no keyword scores.
 */
export function classifySubmissionType(input: {
  text: string;
  source?: string | null;
  existingHints?: Record<string, unknown> | null;
}): SubmissionTypeClassification {
  const hints = input.existingHints ?? {};
  const text = normalizeText([
    input.text,
    input.source,
    hints.documentTitle,
    hints.subject,
  ].filter(Boolean).join(' '));

  const scored = candidates
    .map((candidate) => {
      const primaryScore = scoreKeywords(text, candidate.keywords);
      const subTypeScores = candidate.subTypes.map((subType) => ({
        ...subType,
        ...scoreKeywords(text, subType.keywords),
      })).sort((a, b) => b.score - a.score);
      const bestSubType = subTypeScores[0] ?? null;
      return {
        candidate,
        score: primaryScore.score + (bestSubType?.score ?? 0),
        evidence: [...primaryScore.evidence, ...(bestSubType?.evidence ?? [])],
        bestSubType: bestSubType && bestSubType.score > 0 ? bestSubType : null,
      };
    })
    .sort((a, b) => b.score - a.score || a.candidate.label.localeCompare(b.candidate.label));

  const top = scored[0];
  const runnerUp = scored[1];
  // No keyword scored at all: the text supports no submission type. Return an
  // explicit unknown result instead of fabricating a default — a confident-looking
  // 'new_business' is worse than an honest unknown.
  if (!top || top.score <= 0) {
    return unknownSubmissionTypeResult(MODEL_VERSION);
  }
  const selected = top;
  const confidence = confidenceFromScores(selected.score, runnerUp?.score ?? 0);

  return {
    modelVersion: MODEL_VERSION,
    submissionTypeCode: selected.candidate.code,
    submissionTypeLabel: selected.candidate.label,
    submissionSubTypeCode: selected.bestSubType?.code ?? null,
    submissionSubTypeLabel: selected.bestSubType?.label ?? null,
    confidence,
    needsReview: confidence < 0.7 || selected.score <= 0,
    evidence: selected.evidence.slice(0, 8),
    alternatives: scored.slice(1, 4).map((entry) => ({
      submissionTypeCode: entry.candidate.code,
      submissionTypeLabel: entry.candidate.label,
      score: entry.score,
    })),
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, unknown>;
}

/** OCR text lives under `structured_data.ocr.text`. */
function ocrTextOf(document: SubmissionOutput | null | undefined): string {
  const ocr = toRecord(toRecord(document?.structuredData).ocr);
  return typeof ocr.text === 'string' ? ocr.text : '';
}

/**
 * Pipeline stage that determines the submission/transaction TYPE. Runs after OCR
 * and before classification. LLM-primary (Gemini agent when GEMINI_API_KEY is
 * set) with the free keyword heuristic as the fallback — exactly the convention
 * the LOB classifier uses.
 */
export class SubmissionTypeService {
  private readonly agent: SubmissionTypeAgent;

  constructor(deps: { submissionTypeAgent?: SubmissionTypeAgent } = {}) {
    this.agent = deps.submissionTypeAgent ?? new GeminiSubmissionTypeAgent();
  }

  async process(payload: any = {}): Promise<Record<string, unknown>> {
    return runStage('submissionType', () => this.runSubmissionType(payload));
  }

  /**
   * Prefer the Gemini agent when a key is configured (LLM-primary convention),
   * otherwise — or if the paid call fails — fall back to the free keyword
   * heuristic. A fallback is reported as a warning so degraded runs are visible
   * on the stage result, not just in server logs.
   */
  private async determineWithPolicy(
    input: SubmissionTypeInput,
  ): Promise<{ result: SubmissionTypeClassification; warning: string | null }> {
    if (this.agent.isAvailable()) {
      try {
        return { result: await this.agent.determine(input), warning: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // eslint-disable-next-line no-console
        console.warn('submissionType: agent failed, falling back to heuristic:', message);
        return {
          result: classifySubmissionType(input),
          warning: `submission-type agent failed; keyword heuristic used: ${message}`,
        };
      }
    }
    return { result: classifySubmissionType(input), warning: null };
  }

  private async runSubmissionType(payload: any = {}): Promise<Record<string, unknown>> {
    if (payload?.submission?.id) {
      const determination = await this.determineOne(payload.submission, {
        text: payload?.ocr?.text ?? payload?.submissionTypeText ?? payload?.text,
        source: payload?.submission?.source ?? payload?.source,
      });
      const warnings = typeof determination.warning === 'string' ? [determination.warning] : [];
      return { ok: true, service: 'submissionType', ...determination, warnings };
    }

    // Ad-hoc invocation (route/test): determine from raw text without persistence.
    const text = String(payload?.ocr?.text ?? payload?.text ?? '').trim();
    const { result, warning } = await this.determineWithPolicy({
      text,
      source: payload?.source ?? null,
    });
    return {
      ok: true,
      service: 'submissionType',
      submissionId: null,
      documentId: null,
      warning,
      ...result,
      warnings: typeof warning === 'string' ? [warning] : [],
    };
  }

  private async determineOne(
    submission: Submission | Record<string, any>,
    input: { document?: SubmissionOutput | null; text?: unknown; source?: unknown },
  ): Promise<Record<string, unknown>> {
    const submissionId = Number((submission as any).id ?? 0);
    const organizationId = Number((submission as any).organizationId ?? 0) || null;
    const source = String(input.source ?? (submission as any).source ?? '');
    let document = input.document ?? null;

    if (!document && submissionId > 0) {
      document = await SubmissionOutput.findOne({ where: { submissionId }, order: [['id', 'ASC']] });
    }

    const text = String(input.text ?? ocrTextOf(document) ?? '').trim();
    const persisted = toRecord(document?.structuredData);
    const hints = {
      documentTitle: persisted.documentTitle,
      subject: persisted.subject,
    };
    const { result, warning } = await this.determineWithPolicy({ text, source, existingHints: hints });

    if (submissionId > 0) {
      if (!document) {
        document = await SubmissionOutput.create({
          submissionId,
          organizationId,
          structuredData: text ? { ocr: { text } } : null,
        });
      }

      const nextStructuredData = {
        ...(document.structuredData ?? {}),
        submissionType: result,
        // Headline scalars the board card / per-type routing read directly; the
        // sub-type now lives only in the reconciled `canonical` block.
        submissionTypeCode: result.submissionTypeCode,
        submissionTypeLabel: result.submissionTypeLabel,
      };
      document.structuredData = {
        ...nextStructuredData,
        canonical: buildCanonicalView(nextStructuredData),
      };
      await document.save();
    }

    return {
      submissionId,
      documentId: document?.id ?? null,
      submission_type: result.submissionTypeCode,
      warning,
      ...result,
    };
  }
}
