/**
 * Issue #3 — extraction versioning + derived confidence, REAL-DATABASE test.
 *
 * Runs the extraction stage TWICE for the same submission against Postgres and
 * proves:
 *   1. each run appends a NEW extractionVersion (1 then 2) — prior rows preserved,
 *   2. the latest-version reader returns only the newest generation,
 *   3. the persisted confidence is the DERIVED value (scoreFieldConfidence),
 *      not the old hardcoded constants.
 *
 * Requires Postgres on 127.0.0.1:5432 (see test/helpers/db.ts + globalSetup).
 *
 * NOTE: the agent's Bash sandbox blocks the Postgres connection on 5432, so this
 * suite was authored but may need to be run by the maintainer.
 */
import { getSequelize } from '../../src/config/database';
import { ExtractedField, SubmissionDocument, Submission } from '../../src/db/models';
import { initTestDb } from '../helpers/db';
import { ExtractionService } from '../../src/pipeline/extraction/service';
import { scoreFieldConfidence } from '../../src/pipeline/extraction/confidence';
import { getLatestExtractedFields } from '../../src/pipeline/extraction/versioning';
import type { ExtractionAgent } from '../../src/pipeline/extraction/GeminiExtractionProvider';

// Force the deterministic regex/NER fallback so the test needs no Gemini key.
const offlineAgent: ExtractionAgent = {
  isAvailable: () => false,
  extract: async () => {
    throw new Error('not used');
  },
};

const OCR_TEXT = ['Risk Type: Hurricane', 'Coverage Limit: $3,000,000', 'Deductible: $250,000'].join('\n');

describe('Issue #3 — extraction versioning + derived confidence (real DB)', () => {
  (global as any).jest?.setTimeout?.(60000);

  let SUBMISSION_ID: number;

  beforeAll(async () => {
    await initTestDb();
    // submission_outputs.submission_id has a FK to submissions(id); create a real row.
    const submission = await Submission.create({ status: 'draft' } as any);
    SUBMISSION_ID = submission.id;
  }, 60000);

  afterAll(async () => {
    await getSequelize().close();
  });

  it('appends a new version on rerun, preserves history, and persists derived confidence', async () => {
    const service = new ExtractionService({ extractionAgent: offlineAgent });
    const payload = { submission: { id: SUBMISSION_ID }, ocr: { text: OCR_TEXT } };

    const run1: any = await service.process(payload);
    expect(run1.ok).toBe(true);
    expect(run1.extractionVersion).toBe(1);
    expect(run1.structuredData.extractionVersion).toBe(1);
    expect(run1.structuredData.source).toBe('ocr_ner');

    const run2: any = await service.process(payload);
    expect(run2.extractionVersion).toBe(2);
    expect(run2.structuredData.extractionVersion).toBe(2);

    const doc = await SubmissionDocument.findOne({ where: { submissionId: SUBMISSION_ID } });
    expect(doc).toBeTruthy();

    // Both generations persisted — history preserved (no clobber).
    const all = await ExtractedField.findAll({ where: { documentId: doc!.id } });
    const versions = new Set(all.map((r) => r.extractionVersion));
    expect(versions).toEqual(new Set([1, 2]));
    const v1 = all.filter((r) => r.extractionVersion === 1);
    const v2 = all.filter((r) => r.extractionVersion === 2);
    expect(v1.length).toBeGreaterThan(0);
    expect(v2.length).toBe(v1.length);

    // Latest-version reader returns only the newest generation.
    const latest = await getLatestExtractedFields(doc!.id);
    expect(latest.length).toBe(v2.length);
    expect(latest.every((r) => r.extractionVersion === 2)).toBe(true);

    // Confidence is the DERIVED value, not the old constant (limit used to be 0.9
    // hardcoded but regex source now yields 0.55 + 0.20 = 0.75).
    const limitRow = latest.find((r) => r.fieldName === 'limit');
    expect(limitRow).toBeTruthy();
    const expected = scoreFieldConfidence('limit', limitRow!.fieldValue, 'ocr_ner');
    expect(limitRow!.confidence).toBeCloseTo(expected, 5);
    expect(limitRow!.confidence).toBeCloseTo(0.75, 5);
    expect(limitRow!.confidence).not.toBeCloseTo(0.9, 2); // not the old hardcoded constant
  }, 60000);
});
