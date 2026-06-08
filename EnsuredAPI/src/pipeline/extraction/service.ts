import { ExtractedField, SubmissionDocument } from '../../db/models';
import { runStage } from '../stageResult';
import { ExtractionAgent, GeminiExtractionAgent } from './GeminiExtractionProvider';
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
  const limit = firstMoney(text, /(?:limit|coverage\s+limit|deal\s+size|notional)[^\d$]*\$?\s*([\d.,]+)\s*([kmb])?/i);
  const deductible = firstMoney(text, /(?:deductible)[^\d$]*\$?\s*([\d.,]+)\s*([kmb])?/i);
  const effectiveDate = firstMatch(text, /(?:effective\s+date|inception\s+date)\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
  const expectedYieldRaw = firstMatch(text, /(?:expected\s+yield|target\s+yield)\s*[:\-]?\s*(\d{1,2}(?:\.\d+)?)\s*%/i);
  const riskType = firstMatch(text, /(?:risk\s+type|peril|coverage\s+class)\s*[:\-]?\s*([A-Za-z][A-Za-z -]{1,40})/i);
  const triggerType = firstMatch(text, /(?:trigger\s+type|settlement\s+trigger)\s*[:\-]?\s*([A-Za-z][A-Za-z -]{1,40})/i);
  const propertyLocation = firstMatch(text, /(?:property\s+location|insured\s+location|address)\s*[:\-]?\s*([^\n\r]{6,120})/i);
  const companyDomain = firstMatch(text, /(?:company\s+domain|email\s+domain|website)\s*[:\-]?\s*([a-z0-9.-]+\.[a-z]{2,})/i);
  const oracleDataSource = firstMatch(text, /(?:oracle\s+source|attestation\s+source|weather\s+feed|data\s+source)\s*[:\-]?\s*([^\n\r]{3,120})/i);
  const subjects = extractSubjects(text);

  return {
    limit,
    deductible,
    effectiveDate,
    expectedYield: expectedYieldRaw ? Number(expectedYieldRaw) / 100 : null,
    riskType,
    triggerType,
    propertyLocation,
    companyDomain,
    oracleDataSource,
    subjectCount: subjects.length > 0 ? subjects.length : null,
    subjects,
  };
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
   * or if the call fails — falling back to the regex NER. Returns the field set
   * plus which path produced it.
   */
  private async extractWithPolicy(text: string): Promise<{ entities: Record<string, unknown>; source: string }> {
    if (text && this.agent.isAvailable()) {
      try {
        return { entities: await this.agent.extract({ text }), source: 'gemini_extraction' };
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('extraction: agent failed, falling back to regex NER:', err instanceof Error ? err.message : err);
      }
    }
    return { entities: extractEntities(text), source: 'ocr_ner' };
  }

  private async runExtraction(payload: any): Promise<Record<string, unknown>> {
    const submission = payload?.submission;
    const ocrText = String(payload?.ocr?.text ?? '').trim();
    const { entities, source } = await this.extractWithPolicy(ocrText);

    const structuredData: Record<string, unknown> = {
      ...entities,
      source,
      extractedAt: new Date().toISOString(),
    };

    const persistedFields: string[] = [];
    let extractionVersion: number | null = null;
    if (submission?.id) {
      const submissionId = Number(submission.id);
      let doc = await SubmissionDocument.findOne({ where: { submissionId } });

      // Versioning: append a new generation of fields on each run. The next
      // version is (max existing extractionVersion for this document) + 1; the
      // very first run for a fresh document is 1. Prior rows are NEVER deleted —
      // history is preserved and auditable. A brand-new document has no rows yet,
      // so its first run is version 1 without a query.
      extractionVersion = doc ? await computeNextExtractionVersion(doc.id) : 1;
      structuredData.extractionVersion = extractionVersion;

      if (!doc) {
        doc = await SubmissionDocument.create({
          submissionId,
          tenantId: submission.tenantId ?? null,
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
        if (typeof fieldValue === 'object') continue;
        await ExtractedField.create({
          documentId: doc.id,
          tenantId: submission.tenantId ?? null,
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
    };
  }
}
