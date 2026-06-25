import { ExtractedField, SubmissionOutput } from '../../db/models';
import { runStage } from '../stageResult';
import {
  EXTRACTION_PROMPT_VERSION,
  ExtractionAgent,
  GeminiExtractionAgent,
  deriveInsuredSubject,
} from './GeminiExtractionProvider';
import { scoreFieldConfidence } from './confidence';
import { extractSubjects } from './sov';
import { computeNextExtractionVersion } from './versioning';

type MaybeString = string | null;

function normalizeToken(token: string | undefined): string {
  return String(token ?? '').trim().toLowerCase();
}

function parseScaledMoney(raw: string, scaleRaw: string | undefined): number {
  const amount = Number(String(raw).replace(/,/g, ''));
  const scale = normalizeToken(scaleRaw);
  if (!Number.isFinite(amount)) return 0;
  if (scale === 'm') return amount * 1_000_000;
  if (scale === 'b') return amount * 1_000_000_000;
  if (scale === 'k') return amount * 1_000;
  return amount;
}

function firstMatch(text: string, pattern: RegExp, idx = 1): MaybeString {
  const m = text.match(pattern);
  return m && m[idx] ? String(m[idx]).trim() : null;
}

function firstMoney(text: string, pattern: RegExp): number | null {
  const m = text.match(pattern);
  if (!m) return null;
  return parseScaledMoney(m[1], m[2]);
}

function extractEntities(text: string): Record<string, unknown> {
  const namedInsured = firstMatch(
    text,
    /(?:named\s+insured|insured\s+name|name\s+of\s+(?:the\s+)?insured|policyholder|applicant)\s*[:\-]\s*([^\n\r]{2,120})/i,
  );
  const insuredSubjectRaw = firstMatch(
    text,
    /(?:insured\s+subject|subject\s+of\s+insurance|interest\s+insured|description\s+of\s+(?:the\s+)?(?:risk|property|insured\s+property)|what\s+is\s+being\s+insured)\s*[:\-]?\s*([^\n\r]{3,160})/i,
  );
  const limit = firstMoney(text, /(?:limit|coverage\s+limit|deal\s+size|notional)[^\d$]*\$?\s*([\d.,]+)\s*([kmb])?/i);
  const deductible = firstMoney(text, /(?:deductible)[^\d$]*\$?\s*([\d.,]+)\s*([kmb])?/i);
  const effectiveDate = firstMatch(text, /(?:effective\s+date|inception\s+date)\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
  const expectedYieldRaw = firstMatch(text, /(?:expected\s+yield|target\s+yield)\s*[:\-]?\s*(\d{1,2}(?:\.\d+)?)\s*%/i);
  const riskType = firstMatch(text, /(?:risk\s+type|perils?|coverage\s+class)\s*[:\-]?\s*([A-Za-z][A-Za-z _-]{1,40})/i);
  const triggerType = firstMatch(text, /(?:trigger\s+type|settlement\s+trigger)\s*[:\-]?\s*([A-Za-z][A-Za-z -]{1,40})/i);
  const propertyLocation = firstMatch(text, /(?:property\s+location|insured\s+location|address)\s*[:\-]?\s*([^\n\r]{6,120})/i);
  const companyDomain = firstMatch(text, /(?:company\s+domain|email\s+domain|website)\s*[:\-]?\s*([a-z0-9.-]+\.[a-z]{2,})/i);
  const oracleDataSource = firstMatch(text, /(?:oracle\s+source|attestation\s+source|weather\s+feed|data\s+source)\s*[:\-]?\s*([^\n\r]{3,120})/i);
  const subjects = extractSubjects(text);

  const subjectCount = subjects.length > 0 ? subjects.length : null;

  return {
    namedInsured,
    insuredSubject: deriveInsuredSubject({
      insuredSubject: insuredSubjectRaw,
      subjects,
      subjectCount,
      riskType,
      propertyLocation,
    }),
    limit,
    deductible,
    effectiveDate,
    expectedYield: expectedYieldRaw ? Number(expectedYieldRaw) / 100 : null,
    riskType,
    triggerType,
    propertyLocation,
    companyDomain,
    oracleDataSource,
    subjectCount,
    subjects,
    // The regex NER always sees the full text — only the LLM path truncates.
    inputTruncated: false,
  };
}

/**
 * Fill fields the LLM agent returned as null/undefined with values the regex NER
 * finds verbatim in the text. Strictly additive: an agent-provided value is never
 * overridden, and `subjects` is only adopted when the agent found none at all.
 */
function backfillFromHeuristic(
  agentEntities: Record<string, unknown>,
  text: string,
): { entities: Record<string, unknown>; backfilled: string[] } {
  const heuristic = extractEntities(text);
  const entities: Record<string, unknown> = { ...agentEntities };
  const backfilled: string[] = [];

  for (const [key, value] of Object.entries(heuristic)) {
    if (key === 'inputTruncated' || key === 'subjects' || key === 'subjectCount') continue;
    if (entities[key] === null || entities[key] === undefined) {
      if (value === null || value === undefined) continue;
      entities[key] = value;
      backfilled.push(key);
    }
  }

  const agentSubjects = Array.isArray(agentEntities.subjects) ? agentEntities.subjects : [];
  const heuristicSubjects = Array.isArray(heuristic.subjects) ? heuristic.subjects : [];
  if (agentSubjects.length === 0 && heuristicSubjects.length > 0) {
    entities.subjects = heuristicSubjects;
    entities.subjectCount = heuristic.subjectCount;
    backfilled.push('subjects');
  }

  return { entities, backfilled };
}

export class ExtractionService {
  private readonly agent: ExtractionAgent;

  /** The Gemini agent is injectable for testing; dormant without a key. */
  constructor(deps: { extractionAgent?: ExtractionAgent } = {}) {
    this.agent = deps.extractionAgent ?? new GeminiExtractionAgent();
  }

  async process(payload: any): Promise<Record<string, unknown>> {
    return runStage('extraction', () => this.runExtraction(payload));
  }

  /**
   * Extract entities, preferring the Gemini agent when configured and otherwise —
   * or if the call fails — falling back to the regex NER. Returns the field set,
   * which path produced it, and a warning when the run was degraded (so the
   * board surfaces the fallback instead of it living only in server logs).
   */
  private async extractWithPolicy(
    text: string,
  ): Promise<{ entities: Record<string, unknown>; source: string; warning: string | null }> {
    if (text && this.agent.isAvailable()) {
      try {
        const agentEntities = await this.agent.extract({ text });
        const { entities, backfilled } = backfillFromHeuristic(agentEntities, text);
        return {
          entities,
          source: 'gemini_extraction',
          warning: backfilled.length
            ? `regex NER backfilled fields the extraction agent missed: ${backfilled.join(', ')}`
            : null,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // eslint-disable-next-line no-console
        console.warn('extraction: agent failed, falling back to regex NER:', message);
        return {
          entities: extractEntities(text),
          source: 'ocr_ner',
          warning: `extraction agent failed; regex fallback used: ${message}`,
        };
      }
    }
    return { entities: extractEntities(text), source: 'ocr_ner', warning: null };
  }

  private async runExtraction(payload: any): Promise<Record<string, unknown>> {
    const submission = payload?.submission;
    const ocrText = String(payload?.ocr?.text ?? '').trim();
    const { entities, source, warning } = await this.extractWithPolicy(ocrText);

    // Guarantee an explicit "what is being insured" descriptor for every
    // submission. The agent and the regex NER each derive this from their own
    // view, but the heuristic backfill can add a peril/location the agent missed
    // — so re-derive here from the merged entities whenever it is still absent.
    if (entities.insuredSubject === null || entities.insuredSubject === undefined) {
      entities.insuredSubject = deriveInsuredSubject({
        insuredSubject: entities.insuredSubject,
        subjects: Array.isArray(entities.subjects) ? (entities.subjects as any) : [],
        subjectCount: typeof entities.subjectCount === 'number' ? entities.subjectCount : null,
        riskType: entities.riskType,
        propertyLocation: entities.propertyLocation,
      });
    }

    const warnings: string[] = warning ? [warning] : [];
    if (!ocrText) warnings.push('extraction ran with empty OCR text');
    if (entities.inputTruncated === true) {
      warnings.push(`LLM extraction input truncated at 12000 chars (document is ${ocrText.length} chars)`);
    }

    const structuredData: Record<string, unknown> = {
      ...entities,
      source,
      // Attribute LLM extractions to the prompt revision that produced them.
      ...(source === 'gemini_extraction' ? { promptVersion: EXTRACTION_PROMPT_VERSION } : {}),
      extractedAt: new Date().toISOString(),
    };

    const persistedFields: string[] = [];
    let extractionVersion: number | null = null;
    if (submission?.id) {
      const submissionId = Number(submission.id);
      let doc = await SubmissionOutput.findOne({ where: { submissionId } });

      // Versioning: append a new generation of fields on each run. The next
      // version is (max existing extractionVersion for this document) + 1; the
      // very first run for a fresh document is 1. Prior rows are NEVER deleted —
      // history is preserved and auditable. A brand-new document has no rows yet,
      // so its first run is version 1 without a query.
      extractionVersion = doc ? await computeNextExtractionVersion(doc.id) : 1;
      structuredData.extractionVersion = extractionVersion;

      if (!doc) {
        doc = await SubmissionOutput.create({
          submissionId,
          organizationId: submission.organizationId ?? null,
          structuredData: {
            extraction: structuredData,
            ...(ocrText ? { ocr: { text: ocrText } } : {}),
          },
        });
      } else {
        const existing = (doc.structuredData ?? {}) as Record<string, unknown>;
        const existingExtraction = (existing.extraction ?? {}) as Record<string, unknown>;
        const existingOcr = (existing.ocr ?? {}) as Record<string, unknown>;
        doc.structuredData = {
          ...existing,
          extraction: { ...existingExtraction, ...structuredData },
          // Backfill OCR text if the OCR stage didn't already persist it.
          ...(ocrText && !existingOcr.text ? { ocr: { ...existingOcr, text: ocrText } } : {}),
        };
        await doc.save();
      }

      for (const [fieldName, fieldValue] of Object.entries(entities)) {
        if (fieldValue === null || fieldValue === undefined || String(fieldValue).trim().length === 0) continue;
        // Non-scalar fields (e.g. the `subjects` portfolio) live in structuredData,
        // not as flat ExtractedField rows — skip them here to avoid "[object Object]".
        // Run metadata (e.g. the inputTruncated flag) is not an extracted field.
        if (typeof fieldValue === 'object' || typeof fieldValue === 'boolean') continue;
        await ExtractedField.create({
          documentId: doc.id,
          organizationId: submission.organizationId ?? null,
          fieldName,
          fieldValue: String(fieldValue),
          // Derived, deterministic confidence from the field's value + the actual
          // extraction source — replaces the old hardcoded per-field constants.
          confidence: scoreFieldConfidence(fieldName, fieldValue, source),
          sourceLocation: null,
          extractionVersion,
        });
        persistedFields.push(fieldName);
      }
    }

    return {
      ok: true,
      service: 'extraction',
      structuredData,
      persistedFields,
      extractionVersion,
      warnings,
    };
  }
}
