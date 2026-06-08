// Mock DB models so extraction persistence runs without a database.
jest.mock('../../db/models', () => ({
  ExtractedField: { create: jest.fn() },
  SubmissionDocument: { findOne: jest.fn(), create: jest.fn() },
}));

import { ExtractedField, SubmissionDocument } from '../../db/models';
import { ExtractionService } from './service';
import { ExtractionAgent, ExtractedEntities } from './GeminiExtractionProvider';

const findOne = SubmissionDocument.findOne as unknown as jest.Mock;
const create = SubmissionDocument.create as unknown as jest.Mock;
const fieldCreate = ExtractedField.create as unknown as jest.Mock;

function fakeDoc() {
  return { id: 5, documentType: null, classificationConfidence: null, structuredData: null, save: jest.fn() };
}

const AGENT_ENTITIES: ExtractedEntities = {
  limit: 9_000_000,
  deductible: 100_000,
  effectiveDate: '2026-03-01',
  expectedYield: 0.11,
  riskType: 'cyber',
  triggerType: 'indemnity',
  propertyLocation: null,
  companyDomain: 'beta.example',
  oracleDataSource: null,
  subjectCount: null,
  subjects: [],
};

beforeEach(() => {
  findOne.mockReset().mockResolvedValue(null);
  create.mockReset().mockImplementation(async () => fakeDoc());
  fieldCreate.mockReset().mockResolvedValue({});
});

describe('ExtractionService agent policy (no live request)', () => {
  it('uses the agent when available and tags the source', async () => {
    const extract = jest.fn().mockResolvedValue(AGENT_ENTITIES);
    const agent: ExtractionAgent = { isAvailable: () => true, extract };

    const res: any = await new ExtractionService({ extractionAgent: agent }).process({
      submission: { id: 1, tenantId: 1 },
      ocr: { text: 'unstructured submission narrative' },
    });

    expect(res.ok).toBe(true);
    expect(res.structuredData.source).toBe('gemini_extraction');
    expect(res.structuredData.limit).toBe(9_000_000);
    expect(extract).toHaveBeenCalledTimes(1);
    expect(res.persistedFields).toEqual(expect.arrayContaining(['limit', 'riskType', 'companyDomain']));
  });

  it('falls back to the regex NER when the agent throws', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const extract = jest.fn().mockRejectedValue(new Error('quota'));
    const agent: ExtractionAgent = { isAvailable: () => true, extract };

    const res: any = await new ExtractionService({ extractionAgent: agent }).process({
      submission: { id: 2 },
      ocr: { text: 'Coverage limit: $5,000,000\nDeductible: $250,000' },
    });

    expect(res.structuredData.source).toBe('ocr_ner');
    expect(res.structuredData.limit).toBe(5_000_000); // regex still extracted it
    warn.mockRestore();
  });

  it('uses the regex NER (no agent call) when the agent is unavailable', async () => {
    const extract = jest.fn();
    const agent: ExtractionAgent = { isAvailable: () => false, extract };

    const res: any = await new ExtractionService({ extractionAgent: agent }).process({
      submission: { id: 3 },
      ocr: { text: 'Coverage limit: $1,000,000' },
    });

    expect(res.structuredData.source).toBe('ocr_ner');
    expect(extract).not.toHaveBeenCalled();
  });
});
