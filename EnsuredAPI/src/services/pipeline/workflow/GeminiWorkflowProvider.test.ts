import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { GeminiWorkflowAgent, projectSignals, statusForDecision } from './GeminiWorkflowProvider';

// Mock the LangChain model so NO live request is ever sent.
jest.mock('@langchain/google-genai');
const MockChat = ChatGoogleGenerativeAI as unknown as jest.Mock;
const invoke = jest.fn();
const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;
const EMPTY = { validation: {}, preRating: {}, oracleAttestation: {}, capacityMatch: {} };

beforeEach(() => {
  MockChat.mockReset();
  invoke.mockReset();
  MockChat.mockImplementation(() => ({ invoke }));
});

describe('GeminiWorkflowAgent', () => {
  it('is available only when a Gemini key is set', () => {
    expect(new GeminiWorkflowAgent(env({})).isAvailable()).toBe(false);
    expect(new GeminiWorkflowAgent(env({ GEMINI_API_KEY: 'k' })).isAvailable()).toBe(true);
  });

  const agent = () => new GeminiWorkflowAgent(env({ GEMINI_API_KEY: 'k', GEMINI_MODEL: 'test-model' }));

  it('maps a valid decision JSON (mocked model, no live request)', async () => {
    invoke.mockResolvedValue({
      content: JSON.stringify({ decision: 'PRIORITY_ROUTE', reasons: ['grade A'] }),
    });
    const d = await agent().decide(EMPTY);
    expect(d.decision).toBe('PRIORITY_ROUTE');
    expect(d.suggestedSubmissionStatus).toBe('modeling');
    expect(d.reasons).toEqual(['grade A']);
    expect(MockChat).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'k', model: 'test-model', json: true }));
  });

  it('derives the status from the decision — the model cannot produce an incoherent pair', async () => {
    // Even if the model volunteers a (wrong) status, the derived mapping wins.
    invoke.mockResolvedValue({
      content: JSON.stringify({ decision: 'OUT_OF_APPETITE', suggestedSubmissionStatus: 'modeling' }),
    });
    const d = await agent().decide(EMPTY);
    expect(d.suggestedSubmissionStatus).toBe('rejected');
  });

  it('throws on an invalid decision so the caller can fall back', async () => {
    invoke.mockResolvedValue({ content: JSON.stringify({ decision: 'YOLO_ROUTE' }) });
    await expect(agent().decide(EMPTY)).rejects.toThrow(/invalid decision/);
  });
});

describe('statusForDecision (derived, mirrors the rubric one-to-one)', () => {
  it('maps every decision to its rubric status', () => {
    expect(statusForDecision('OUT_OF_APPETITE')).toBe('rejected');
    expect(statusForDecision('MORE_INFO')).toBe('submitted');
    expect(statusForDecision('ORACLE_INCOMPATIBLE')).toBe('submitted');
    expect(statusForDecision('ROUTE_PARTNER_POOL')).toBe('modeling');
    expect(statusForDecision('PRIORITY_ROUTE')).toBe('modeling');
    expect(statusForDecision('REVIEW')).toBe('modeling');
  });
});

describe('projectSignals (named-key projection, replaces stringify-and-slice)', () => {
  it('keeps only the rubric keys and bounds free-text reasons', () => {
    const projected = projectSignals({
      validation: {
        decision: 'FLAGGED',
        flaggedForMoreInfo: true,
        appetite: { decision: 'IN_APPETITE', hugeBlob: 'x'.repeat(5000) },
        reasons: ['a'.repeat(500), 'b', 'c', 'd', 'e', 'f', 'g'],
        ocrText: 'x'.repeat(50000), // upstream noise must not reach the prompt
      },
      preRating: { grade: 'A', numericScore: 82, priorityRank: 1, internalDetail: { big: true } },
      oracleAttestation: { smartContractReady: true, reason: 'ok' },
      capacityMatch: { route: 'standard_queue', somethingElse: 'dropped' },
    });
    expect(projected.validation.ocrText).toBeUndefined();
    expect(projected.validation.appetiteDecision).toBe('IN_APPETITE');
    expect((projected.validation.reasons as string[]).length).toBe(5);
    expect((projected.validation.reasons as string[])[0].length).toBe(200);
    expect(projected.preRating).toEqual({ grade: 'A', numericScore: 82, priorityRank: 1 });
    expect(projected.capacityMatch).toEqual({ route: 'standard_queue' });
  });
});
