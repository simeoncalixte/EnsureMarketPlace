import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { GeminiSubmissionTypeAgent } from './GeminiSubmissionTypeProvider';

// Mock the LangChain model so NO live request is ever sent.
jest.mock('@langchain/google-genai');
const MockChat = ChatGoogleGenerativeAI as unknown as jest.Mock;
const invoke = jest.fn();
const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;

beforeEach(() => {
  MockChat.mockReset();
  invoke.mockReset();
  MockChat.mockImplementation(() => ({ invoke }));
});

describe('GeminiSubmissionTypeAgent.isAvailable (LLM-primary: key present)', () => {
  it('available when a Gemini key is set, off otherwise', () => {
    expect(new GeminiSubmissionTypeAgent(env({})).isAvailable()).toBe(false);
    expect(new GeminiSubmissionTypeAgent(env({ GEMINI_API_KEY: '' })).isAvailable()).toBe(false);
    expect(new GeminiSubmissionTypeAgent(env({ GEMINI_API_KEY: 'k' })).isAvailable()).toBe(true);
  });
});

describe('GeminiSubmissionTypeAgent.determine (mocked model, no live request)', () => {
  const agent = () =>
    new GeminiSubmissionTypeAgent(env({ GEMINI_API_KEY: 'secret', GEMINI_MODEL: 'test-model' }));

  it('maps a valid model JSON onto the taxonomy and routes config to the model', async () => {
    invoke.mockResolvedValue({
      content: JSON.stringify({
        submissionTypeCode: 'claim',
        submissionSubTypeCode: 'claim_first_notice_of_loss',
        confidence: 0.93,
        evidence: ['first notice of loss', 'date of loss'],
        alternatives: [{ submissionTypeCode: 'endorsement', score: 12 }],
      }),
    });

    const result = await agent().determine({
      text: 'first notice of loss reported, date of loss 2026-05-12',
    });

    expect(result.submissionTypeCode).toBe('claim');
    expect(result.submissionTypeLabel).toBe('Claim / Loss Notice');
    expect(result.submissionSubTypeCode).toBe('claim_first_notice_of_loss');
    expect(result.submissionSubTypeLabel).toBe('First Notice of Loss');
    expect(result.confidence).toBeCloseTo(0.93);
    expect(result.needsReview).toBe(false);
    expect(result.modelVersion).toBe('subtype-gemini:test-model:p1');
    expect(result.alternatives[0]).toMatchObject({ submissionTypeCode: 'endorsement' });
    expect(MockChat).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'secret', model: 'test-model', temperature: 0, json: true }),
    );
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('drops an invalid sub-type but keeps the valid primary', async () => {
    invoke.mockResolvedValue({
      content: JSON.stringify({ submissionTypeCode: 'renewal', submissionSubTypeCode: 'not_a_real_sub', confidence: 0.6 }),
    });
    const result = await agent().determine({ text: 'renewal terms for the expiring policy' });
    expect(result.submissionTypeCode).toBe('renewal');
    expect(result.submissionSubTypeCode).toBeNull();
    expect(result.needsReview).toBe(true); // confidence < 0.7
  });

  it('throws on an unknown primary code so the caller can fall back', async () => {
    invoke.mockResolvedValue({ content: JSON.stringify({ submissionTypeCode: 'made_up_code', confidence: 0.9 }) });
    await expect(agent().determine({ text: 'whatever' })).rejects.toThrow(/unknown submission-type code/);
  });

  it('maps a model abstention (null code) to an explicit unknown result, not a guess', async () => {
    invoke.mockResolvedValue({ content: JSON.stringify({ submissionTypeCode: null, confidence: 0.2 }) });
    const result = await agent().determine({ text: 'lorem ipsum, not an insurance document' });
    expect(result.submissionTypeCode).toBe('unknown');
    expect(result.confidence).toBe(0);
    expect(result.needsReview).toBe(true);
  });

  it('drops evidence phrases that do not appear in the source text', async () => {
    invoke.mockResolvedValue({
      content: JSON.stringify({
        submissionTypeCode: 'claim',
        confidence: 0.8,
        evidence: ['date of loss', 'fabricated phrase never in the text'],
      }),
    });
    const result = await agent().determine({ text: 'the date of loss was reported to us' });
    expect(result.evidence).toEqual(['date of loss']);
  });

  it('throws on empty text WITHOUT calling the model', async () => {
    await expect(agent().determine({ text: '   ' })).rejects.toThrow(/no text to determine/);
    expect(invoke).not.toHaveBeenCalled();
  });
});
