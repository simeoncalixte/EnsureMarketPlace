import { Op } from 'sequelize';
import { Submission, SubmissionOutput } from '../../../db/models';
import { lineOfBusinessTaxonomy } from '../../../db/seed-data/lineOfBusinessTaxonomy';
import { runStage } from '../stageResult';
import { buildCanonicalView } from '../canonicalView';
import {
  ClassificationAgent,
  ClassificationInput,
  GeminiClassificationAgent,
  unclassifiedResult,
} from './GeminiClassificationProvider';

export type LineOfBusinessClassification = {
  modelVersion: string;
  lineOfBusinessCode: string;
  lineOfBusinessLabel: string;
  lineOfBusinessSubTypeCode: string | null;
  lineOfBusinessSubTypeLabel: string | null;
  confidence: number;
  needsReview: boolean;
  evidence: string[];
  alternatives: Array<{
    lineOfBusinessCode: string;
    lineOfBusinessLabel: string;
    score: number;
  }>;
  /**
   * True when the package appears to bundle MORE THAN ONE distinct line of
   * business (e.g. a marine cargo risk and a D&O risk in different documents).
   * `lineOfBusinessCode` stays the single best HEADLINE line for triage/schema/
   * appetite; the authoritative per-subject breakdown is the insuredSubject
   * stage's `linesOfBusiness`. A multi-LOB package is flagged for review.
   */
  multiLineOfBusiness: boolean;
  /** Distinct lines detected across the package, headline first. */
  lineOfBusinesses: Array<{ lineOfBusinessCode: string; lineOfBusinessLabel: string }>;
};

type ClassificationCandidate = {
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

const MODEL_VERSION = 'lob-keyword-taxonomy-v1';

const candidates: ClassificationCandidate[] = lineOfBusinessTaxonomy.map((primary) => ({
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
    property: ['property', 'building', 'real estate', 'insured location', 'statement of values', 'sov'],
    commercial_property: ['commercial property', 'office', 'retail', 'industrial', 'warehouse', 'tenant improvement'],
    residential_property: ['residential', 'single family', 'multi family', 'condo', 'rental dwelling'],
    catastrophe_property: ['catastrophe', 'cat', 'hurricane', 'windstorm', 'storm surge', 'flood', 'earthquake', 'wildfire', 'noaa', 'parametric'],
    catastrophe_property_windstorm: ['windstorm', 'hurricane', 'typhoon', 'cyclone', 'storm surge', 'noaa'],
    catastrophe_property_flood: ['flood', 'inundation', 'storm surge', 'river gauge'],
    catastrophe_property_earthquake: ['earthquake', 'seismic', 'shake', 'usgs'],
    catastrophe_property_wildfire: ['wildfire', 'brush fire', 'burn perimeter'],
    cyber: ['cyber', 'network security', 'privacy', 'ransomware', 'data breach', 'business interruption'],
    cyber_ransomware: ['ransomware', 'extortion', 'encryption event'],
    data_breach: ['data breach', 'notification', 'forensics', 'privacy breach'],
    aviation: ['aviation', 'aircraft', 'airport', 'drone', 'uas', 'hull'],
    aviation_aircraft_hull: ['aircraft hull', 'airframe', 'engine serial'],
    ocean_marine: ['ocean marine', 'vessel', 'cargo', 'stock throughput', 'terminal operator'],
    cargo: ['cargo', 'shipment', 'freight', 'cold chain', 'bill of lading'],
    hull: ['marine hull', 'yacht', 'charter', 'war risk'],
    inland_marine: ['inland marine', 'contractors equipment', 'installation floater', 'bailee', 'fine arts'],
    general_liability: ['general liability', 'premises operations', 'products completed operations', 'bodily injury'],
    product_liability: ['product liability', 'recall', 'contamination', 'manufacturing defect'],
    excess_liability: ['excess liability', 'umbrella', 'follow form', 'per risk excess'],
    umbrella_liability: ['umbrella liability', 'commercial umbrella', 'blanket excess'],
    professional_liability: ['professional liability', 'malpractice', 'architects', 'engineers', 'consultants'],
    errors_omissions: ['errors omissions', 'e&o', 'tech e&o', 'media e&o'],
    directors_officers: ['directors officers', 'd&o', 'side a', 'side b', 'public company'],
    employment_practices: ['employment practices', 'wrongful termination', 'discrimination', 'harassment', 'wage hour'],
    fiduciary_liability: ['fiduciary', 'erisa', 'plan administration', 'trust services'],
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

export function classifySubmissionLineOfBusiness(input: {
  text: string;
  source?: string | null;
  existingHints?: Record<string, unknown> | null;
}): LineOfBusinessClassification {
  const hints = input.existingHints ?? {};
  const text = normalizeText([
    input.text,
    input.source,
    hints.riskType,
    hints.perilType,
    hints.lineOfBusiness,
    hints.lineOfBusinessSubType,
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
  // No keyword scored at all: this text supports no classification. Return an
  // explicit unclassified result instead of fabricating a default line — a
  // wrong-but-confident-looking 'property' is worse than an honest unknown.
  if (!top || top.score <= 0) {
    return unclassifiedResult(MODEL_VERSION);
  }
  const selected = top;
  const confidence = confidenceFromScores(selected.score, runnerUp?.score ?? 0);

  // Distinct lines the package supports STRONGLY (not just the top): a secondary
  // line counts only when it scores within reach of the leader and clears an
  // absolute floor, so a stray keyword match doesn't fabricate a second line.
  const strongThreshold = Math.max(8, selected.score * 0.6);
  const lineOfBusinesses = scored
    .filter((entry) => entry.score >= strongThreshold)
    .slice(0, 6)
    .map((entry) => ({ lineOfBusinessCode: entry.candidate.code, lineOfBusinessLabel: entry.candidate.label }));
  const multiLineOfBusiness = lineOfBusinesses.length > 1;

  return {
    modelVersion: MODEL_VERSION,
    lineOfBusinessCode: selected.candidate.code,
    lineOfBusinessLabel: selected.candidate.label,
    lineOfBusinessSubTypeCode: selected.bestSubType?.code ?? null,
    lineOfBusinessSubTypeLabel: selected.bestSubType?.label ?? null,
    confidence,
    needsReview: confidence < 0.7 || selected.score <= 0 || multiLineOfBusiness,
    evidence: selected.evidence.slice(0, 8),
    alternatives: scored.slice(1, 4).map((entry) => ({
      lineOfBusinessCode: entry.candidate.code,
      lineOfBusinessLabel: entry.candidate.label,
      score: entry.score,
    })),
    multiLineOfBusiness,
    lineOfBusinesses,
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, unknown>;
}

/** OCR text now lives under `structured_data.ocr.text` instead of a dedicated column. */
function ocrTextOf(document: SubmissionOutput | null | undefined): string {
  const ocr = toRecord(toRecord(document?.structuredData).ocr);
  return typeof ocr.text === 'string' ? ocr.text : '';
}

export class ClassificationService {
  private readonly agent: ClassificationAgent;

  /**
   * The classification agent is injectable for testing; by default it is the
   * Gemini LangChain agent, active whenever `GEMINI_API_KEY` is set (so setting
   * a key is what makes classification billable).
   */
  constructor(deps: { classificationAgent?: ClassificationAgent } = {}) {
    this.agent = deps.classificationAgent ?? new GeminiClassificationAgent();
  }

  async process(payload: any = {}): Promise<Record<string, unknown>> {
    return runStage('classification', () => this.runClassification(payload));
  }

  /**
   * Classify a document, preferring the Gemini agent when a key is configured
   * (the LLM-primary convention) and otherwise — or if the paid call fails —
   * falling back to the free keyword-taxonomy heuristic. Without GEMINI_API_KEY
   * no billable request is ever made. A fallback is reported as a warning so
   * degraded runs are visible on the stage result, not just in server logs.
   */
  private async classifyWithPolicy(
    input: ClassificationInput,
  ): Promise<{ result: LineOfBusinessClassification; warning: string | null }> {
    if (this.agent.isAvailable()) {
      try {
        return { result: await this.agent.classify(input), warning: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // eslint-disable-next-line no-console
        console.warn('classification: agent failed, falling back to heuristic:', message);
        return {
          result: classifySubmissionLineOfBusiness(input),
          warning: `classification agent failed; keyword heuristic used: ${message}`,
        };
      }
    }
    return { result: classifySubmissionLineOfBusiness(input), warning: null };
  }

  private async runClassification(payload: any = {}): Promise<Record<string, unknown>> {
    if (payload?.submission?.id) {
      const classification = await this.classifyOne(payload.submission, {
        text: payload?.ocr?.text ?? payload?.classificationText ?? payload?.text,
        hints: payload?.extraction?.structuredData ?? payload?.normalization?.normalized,
      });
      const warnings = typeof classification.warning === 'string' ? [classification.warning] : [];
      return { ok: true, service: 'classification', ...classification, warnings };
    }

    const limit = Math.max(1, Math.min(100, Number(payload?.limit ?? 25) || 25));
    const organizationId = Number(payload?.organizationId ?? 0) || undefined;
    const results = await this.classifyPendingSubmissions({ organizationId, limit });

    return {
      ok: true,
      service: 'classification',
      processed: results.length,
      classifications: results,
      warnings: results
        .map((r) => r.warning)
        .filter((w): w is string => typeof w === 'string' && w.length > 0),
    };
  }

  async classifyPendingSubmissions(options: { organizationId?: number; limit?: number } = {}): Promise<Array<Record<string, unknown>>> {
    const where: Record<string, unknown> = {
      // OCR text is persisted under structured_data.ocr.text (JSONB path).
      'structuredData.ocr.text': { [Op.ne]: null },
      [Op.or]: [
        { documentType: null },
        { classificationConfidence: null },
      ],
    };
    if (options.organizationId) where.organizationId = options.organizationId;

    const documents = await SubmissionOutput.findAll({
      where,
      include: [{ model: Submission, as: 'submission' }],
      order: [['id', 'ASC']],
      limit: Math.max(1, Math.min(100, Number(options.limit ?? 25) || 25)),
    }) as PendingDocument[];

    const results: Array<Record<string, unknown>> = [];
    for (const document of documents) {
      const submission = document.submission ?? (await Submission.findByPk(document.submissionId ?? 0));
      if (!submission) continue;

      const classification = await this.classifyOne(submission, {
        document,
        text: ocrTextOf(document),
        hints: document.structuredData,
      });
      results.push(classification);
    }

    return results;
  }

  private async classifyOne(
    submission: Submission | Record<string, any>,
    input: {
      document?: SubmissionOutput | null;
      text?: unknown;
      hints?: unknown;
    },
  ): Promise<Record<string, unknown>> {
    const submissionId = Number((submission as any).id ?? 0);
    const organizationId = Number((submission as any).organizationId ?? 0) || null;
    const source = String((submission as any).source ?? '');
    let document = input.document ?? null;

    if (!document && submissionId > 0) {
      document = await SubmissionOutput.findOne({ where: { submissionId }, order: [['id', 'ASC']] });
    }

    const text = String(input.text ?? ocrTextOf(document) ?? '').trim();
    const persisted = toRecord(document?.structuredData);
    const hints = {
      ...persisted,
      // Extraction nests its fields under `structuredData.extraction`; surface
      // them at the top level so the DB-reload path still finds riskType etc.
      ...toRecord(persisted.extraction),
      ...toRecord(input.hints),
    };
    const { result, warning } = await this.classifyWithPolicy({ text, source, existingHints: hints });

    if (submissionId > 0) {
      if (!document) {
        document = await SubmissionOutput.create({
          submissionId,
          organizationId,
          structuredData: text ? { ocr: { text } } : null,
        });
      }

      document.documentType = result.lineOfBusinessCode;
      document.classificationConfidence = result.confidence;
      const nextStructuredData = {
        ...(document.structuredData ?? {}),
        classification: result,
        // Headline scalars the board card reads directly. The multi-line list,
        // the multi-line flag and the subject counts are NOT duplicated at the top
        // level any more — they live only in the reconciled `canonical` block, so
        // there is one (consistent) source instead of several that can disagree.
        lineOfBusinessCode: result.lineOfBusinessCode,
        lineOfBusiness: result.lineOfBusinessLabel,
        lineOfBusinessSubTypeCode: result.lineOfBusinessSubTypeCode,
        lineOfBusinessSubType: result.lineOfBusinessSubTypeLabel,
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
      document_type: result.lineOfBusinessCode,
      warning,
      ...result,
    };
  }
}
