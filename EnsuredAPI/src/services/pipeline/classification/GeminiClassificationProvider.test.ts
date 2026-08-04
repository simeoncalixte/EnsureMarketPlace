import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { GeminiClassificationAgent } from './GeminiClassificationProvider';

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

describe('GeminiClassificationAgent.isAvailable (LLM-primary: key present)', () => {
  it('available when a Gemini key is set, off otherwise', () => {
    expect(new GeminiClassificationAgent(env({})).isAvailable()).toBe(false);
    expect(new GeminiClassificationAgent(env({ GEMINI_API_KEY: '' })).isAvailable()).toBe(false);
    expect(new GeminiClassificationAgent(env({ GEMINI_API_KEY: 'k' })).isAvailable()).toBe(true);
  });
});

describe('GeminiClassificationAgent.classify (mocked model, no live request)', () => {
  const agent = () =>
    new GeminiClassificationAgent(env({ GEMINI_API_KEY: 'secret', GEMINI_MODEL: 'test-model' }));

  it('maps a valid model JSON onto the taxonomy and routes config to the model', async () => {
    invoke.mockResolvedValue({
      content: JSON.stringify({
        lineOfBusinessCode: 'cyber',
        lineOfBusinessSubTypeCode: 'cyber_network_security',
        confidence: 0.91,
        evidence: ['ransomware', 'data breach'],
        alternatives: [{ lineOfBusinessCode: 'directors_officers', score: 20 }],
      }),
    });

    const result = await agent().classify({ text: 'ransomware incident, data breach, network security' });

    expect(result.lineOfBusinessCode).toBe('cyber');
    expect(result.lineOfBusinessLabel).toBe('Cyber');
    expect(result.lineOfBusinessSubTypeCode).toBe('cyber_network_security');
    expect(result.lineOfBusinessSubTypeLabel).toBe('Network Security');
    expect(result.confidence).toBeCloseTo(0.91);
    expect(result.needsReview).toBe(false);
    expect(result.modelVersion).toBe('lob-gemini:test-model:p4');
    expect(result.alternatives[0]).toMatchObject({ lineOfBusinessCode: 'directors_officers' });
    expect(MockChat).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'secret', model: 'test-model', temperature: 0, json: true }),
    );
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('records a multi-line-of-business package: headline primary + validated distinct set', async () => {
    invoke.mockResolvedValue({
      content: JSON.stringify({
        lineOfBusinessCode: 'cargo',
        confidence: 0.8,
        multiLineOfBusiness: true,
        lineOfBusinesses: [
          { lineOfBusinessCode: 'cargo' },
          { lineOfBusinessCode: 'directors_officers' },
          { lineOfBusinessCode: 'not_a_real_lob' }, // dropped — not in taxonomy
        ],
      }),
    });

    const result = await agent().classify({ text: 'marine cargo and d&o package' });

    expect(result.lineOfBusinessCode).toBe('cargo'); // headline unchanged
    expect(result.multiLineOfBusiness).toBe(true);
    expect(result.needsReview).toBe(true);
    const codes = result.lineOfBusinesses.map((l) => l.lineOfBusinessCode);
    expect(codes).toEqual(['cargo', 'directors_officers']); // headline first, invalid dropped
  });

  it('a single-line model response is not multi-LOB', async () => {
    invoke.mockResolvedValue({ content: JSON.stringify({ lineOfBusinessCode: 'cyber', confidence: 0.9 }) });
    const result = await agent().classify({ text: 'ransomware, data breach' });
    expect(result.multiLineOfBusiness).toBe(false);
    expect(result.lineOfBusinesses).toEqual([{ lineOfBusinessCode: 'cyber', lineOfBusinessLabel: 'Cyber' }]);
  });

  it('drops an invalid sub-type but keeps the valid primary', async () => {
    invoke.mockResolvedValue({
      content: JSON.stringify({ lineOfBusinessCode: 'property', lineOfBusinessSubTypeCode: 'not_a_real_sub', confidence: 0.6 }),
    });
    const result = await agent().classify({ text: 'building, statement of values' });
    expect(result.lineOfBusinessCode).toBe('property');
    expect(result.lineOfBusinessSubTypeCode).toBeNull();
    expect(result.needsReview).toBe(true); // confidence < 0.7
  });

  it('throws on an unknown primary code so the caller can fall back', async () => {
    invoke.mockResolvedValue({ content: JSON.stringify({ lineOfBusinessCode: 'made_up_code', confidence: 0.9 }) });
    await expect(agent().classify({ text: 'whatever' })).rejects.toThrow(/unknown line-of-business code/);
  });

  it('maps a model abstention (null code) to an explicit unclassified result, not a guess', async () => {
    invoke.mockResolvedValue({ content: JSON.stringify({ lineOfBusinessCode: null, confidence: 0.2 }) });
    const result = await agent().classify({ text: 'lorem ipsum, not an insurance document' });
    expect(result.lineOfBusinessCode).toBe('unclassified');
    expect(result.confidence).toBe(0);
    expect(result.needsReview).toBe(true);
  });

  it('drops evidence phrases that do not appear in the source text', async () => {
    invoke.mockResolvedValue({
      content: JSON.stringify({
        lineOfBusinessCode: 'cyber',
        confidence: 0.8,
        evidence: ['ransomware', 'fabricated phrase never in the text'],
      }),
    });
    const result = await agent().classify({ text: 'a ransomware incident hit the insured' });
    expect(result.evidence).toEqual(['ransomware']);
  });

  it('throws on empty text WITHOUT calling the model', async () => {
    await expect(agent().classify({ text: '   ' })).rejects.toThrow(/no text to classify/);
    expect(invoke).not.toHaveBeenCalled();
  });
});
