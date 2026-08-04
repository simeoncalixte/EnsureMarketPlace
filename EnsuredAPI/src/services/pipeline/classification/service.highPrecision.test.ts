// Mock the DB models so classification persistence runs without a database.
jest.mock('../../../db/models', () => ({
  Submission: { findByPk: jest.fn() },
  SubmissionOutput: { findOne: jest.fn(), create: jest.fn() },
}));

import { SubmissionOutput } from '../../../db/models';
import { ClassificationService } from './service';
import { ClassificationAgent } from './GeminiClassificationProvider';

const findOne = SubmissionOutput.findOne as unknown as jest.Mock;
const create = SubmissionOutput.create as unknown as jest.Mock;

function fakeDoc() {
  return { id: 10, documentType: null, classificationConfidence: null, structuredData: null, save: jest.fn() };
}

beforeEach(() => {
  findOne.mockReset().mockResolvedValue(null);
  create.mockReset().mockImplementation(async () => fakeDoc());
});

const AGENT_RESULT = {
  modelVersion: 'lob-gemini:test',
  lineOfBusinessCode: 'cyber',
  lineOfBusinessLabel: 'Cyber',
  lineOfBusinessSubTypeCode: null,
  lineOfBusinessSubTypeLabel: null,
  confidence: 0.95,
  needsReview: false,
  evidence: ['ransomware'],
  alternatives: [],
};

describe('ClassificationService high-precision policy (no live request)', () => {
  it('uses the injected agent when it is available', async () => {
    const classify = jest.fn().mockResolvedValue(AGENT_RESULT);
    const agent: ClassificationAgent = { isAvailable: () => true, classify };

    // Text looks like Property, but the (mocked) agent decides Cyber — proving the agent won.
    const res: any = await new ClassificationService({ classificationAgent: agent }).process({
      submission: { id: 1, organizationId: 1 },
      ocr: { text: 'property building statement of values' },
    });

    expect(res.ok).toBe(true);
    expect(res.modelVersion).toBe('lob-gemini:test');
    expect(res.document_type).toBe('cyber');
    expect(classify).toHaveBeenCalledTimes(1);
  });

  it('falls back to the keyword heuristic when the agent throws', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const classify = jest.fn().mockRejectedValue(new Error('quota exceeded'));
    const agent: ClassificationAgent = { isAvailable: () => true, classify };

    const res: any = await new ClassificationService({ classificationAgent: agent }).process({
      submission: { id: 2 },
      ocr: { text: 'cyber ransomware data breach network security' },
    });

    expect(res.modelVersion).toBe('lob-keyword-taxonomy-v1'); // heuristic
    expect(res.document_type).toBe('cyber');
    expect(classify).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('uses the heuristic (no model call) when the agent is unavailable', async () => {
    const classify = jest.fn();
    const agent: ClassificationAgent = { isAvailable: () => false, classify };

    const res: any = await new ClassificationService({ classificationAgent: agent }).process({
      submission: { id: 3 },
      ocr: { text: 'property building statement of values' },
    });

    expect(res.modelVersion).toBe('lob-keyword-taxonomy-v1');
    expect(classify).not.toHaveBeenCalled();
  });
});
