import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { geminiSemanticJudge } from './semanticAdapter';
import { SemanticInput } from './semantic';

jest.mock('@langchain/google-genai');

const MockChatGoogle = ChatGoogleGenerativeAI as unknown as jest.Mock;

const input: SemanticInput = {
  riskType: 'wind',
  limit: 1_000_000,
  expectedYield: 0.09,
  jurisdiction: 'US',
  lineOfBusiness: 'property',
  guidelines: null,
  rules: [],
};

/** Make the next ChatGoogleGenerativeAI() return a client whose invoke() runs `impl`. */
function stubInvoke(impl: () => Promise<{ content: unknown }>) {
  const invoke = jest.fn(impl);
  MockChatGoogle.mockImplementation(() => ({ invoke }) as any);
  return invoke;
}

describe('geminiSemanticJudge', () => {
  const ORIGINAL_KEY = process.env.GEMINI_API_KEY;

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = ORIGINAL_KEY;
    delete process.env.GEMINI_MODEL;
    delete process.env.GEMINI_TIMEOUT_MS;
    MockChatGoogle.mockReset();
  });

  test('unconfigured (no key) -> null and no client constructed', async () => {
    delete process.env.GEMINI_API_KEY;
    stubInvoke(async () => ({ content: '{}' }));
    expect(await geminiSemanticJudge(input)).toBeNull();
    expect(MockChatGoogle).not.toHaveBeenCalled();
  });

  test('ok response -> parsed verdict, modelVersion defaulted', async () => {
    process.env.GEMINI_API_KEY = 'k';
    process.env.GEMINI_MODEL = 'gemini-test';
    stubInvoke(async () => ({ content: '{"decision":"FLAGGED","confidence":0.8,"findings":[]}' }));
    const v = await geminiSemanticJudge(input);
    expect(v?.decision).toBe('FLAGGED');
    expect(v?.modelVersion).toBe('gemini-test');
  });

  test('routes model, api key and json mode through ChatGoogleGenerativeAI', async () => {
    process.env.GEMINI_API_KEY = 'secret-key';
    process.env.GEMINI_MODEL = 'gemini-test';
    process.env.GEMINI_TIMEOUT_MS = '1234';
    const invoke = stubInvoke(async () => ({ content: '{"decision":"IN_APPETITE","confidence":0.5,"findings":[]}' }));

    await geminiSemanticJudge(input);

    expect(MockChatGoogle).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'secret-key',
        model: 'gemini-test',
        temperature: 0,
        json: true,
      }),
    );
    // timeout is routed as a per-call invoke option
    expect(invoke).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ timeout: 1234 }));
  });

  test('missing / unparseable content -> null', async () => {
    process.env.GEMINI_API_KEY = 'k';
    stubInvoke(async () => ({ content: 'sorry, no json here' }));
    expect(await geminiSemanticJudge(input)).toBeNull();
  });

  test('invoke throws -> null (fail safe)', async () => {
    process.env.GEMINI_API_KEY = 'k';
    stubInvoke(async () => {
      throw new Error('boom');
    });
    expect(await geminiSemanticJudge(input)).toBeNull();
  });
});
