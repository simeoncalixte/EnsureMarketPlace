import { ExtractedField, SubmissionDocument } from '../../db/models';
import { runStage } from '../stageResult';
import { ExtractionAgent, GeminiExtractionAgent } from './GeminiExtractionProvider';

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

/**
 * Best-effort schedule parser for the fallback path. Looks for numbered or
 * bulleted line items that each carry a money amount (a common shape for a plain
 * schedule of values), e.g. "1. Warehouse #3, Miami FL — $2,000,000". This is
 * deliberately conservative: it only fires when at least two such items appear,
 * so prose mentioning a single dollar figure is not mistaken for a portfolio.
 * The Gemini agent does the real work; this keeps the heuristic path from losing
 * portfolio submissions entirely.
 */
function extractSubjects(text: string): Array<Record<string, unknown>> {
  const subjects: Array<Record<string, unknown>> = [];
  const lineItem = /^\s*(?:\d{1,3}[.)]|[-*•])\s*(.+?)\s*[—:\-]\s*\$?\s*([\d.,]+)\s*([kmb])?\s*$/i;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(lineItem);
    if (!m) continue;
    const label = String(m[1]).trim().slice(0, 200);
    const value = parseScaledMoney(m[2], m[3]);
    if (!label || !Number.isFinite(value) || value <= 0) continue;
    subjects.push({
      label,
      assetType: null,
      constructionType: null,
      occupancyType: null,
      location: null,
      riskType: null,
      insuredValue: value,
      limit: null,
    });
    if (subjects.length >= 200) break;
  }
  return subjects.length >= 2 ? subjects : [];
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

    const structuredData = {
      ...entities,
      source,
      extractedAt: new Date().toISOString(),
    };

    const persistedFields: string[] = [];
    if (submission?.id) {
      const submissionId = Number(submission.id);
      let doc = await SubmissionDocument.findOne({ where: { submissionId } });
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

      const confidenceByField: Record<string, number> = {
        limit: 0.9,
        deductible: 0.88,
        effectiveDate: 0.82,
        expectedYield: 0.74,
        riskType: 0.78,
        triggerType: 0.75,
        propertyLocation: 0.72,
        companyDomain: 0.7,
        oracleDataSource: 0.76,
        subjectCount: 0.8,
      };

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
          confidence: confidenceByField[fieldName] ?? 0.65,
          sourceLocation: null,
        });
        persistedFields.push(fieldName);
      }
    }

    return {
      ok: true,
      service: 'extraction',
      structuredData,
      persistedFields,
    };
  }
}
