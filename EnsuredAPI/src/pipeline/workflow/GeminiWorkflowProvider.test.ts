import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { GeminiWorkflowAgent } from './GeminiWorkflowProvider';

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
      content: JSON.stringify({ decision: 'PRIORITY_ROUTE', suggestedSubmissionStatus: 'modeling', reasons: ['grade A'] }),
    });
    const d = await agent().decide(EMPTY);
    expect(d.decision).toBe('PRIORITY_ROUTE');
    expect(d.suggestedSubmissionStatus).toBe('modeling');
    expect(d.reasons).toEqual(['grade A']);
    expect(MockChat).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'k', model: 'test-model', json: true }));
  });

  it('defaults an invalid status to modeling', async () => {
    invoke.mockResolvedValue({ content: JSON.stringify({ decision: 'REVIEW', suggestedSubmissionStatus: 'bogus' }) });
    const d = await agent().decide(EMPTY);
    expect(d.suggestedSubmissionStatus).toBe('modeling');
  });

  it('throws on an invalid decision so the caller can fall back', async () => {
    invoke.mockResolvedValue({ content: JSON.stringify({ decision: 'YOLO_ROUTE' }) });
    await expect(agent().decide(EMPTY)).rejects.toThrow(/invalid decision/);
  });
});
