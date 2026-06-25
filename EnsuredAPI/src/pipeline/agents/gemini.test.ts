import { extractJsonObject, geminiTimeoutMs } from './gemini';

describe('extractJsonObject (string-aware brace matching)', () => {
  it('parses a plain JSON object', () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it('parses JSON surrounded by prose', () => {
    expect(extractJsonObject('Sure! Here it is: {"a":1} hope that helps')).toEqual({ a: 1 });
  });

  it('is not confused by braces inside string values', () => {
    const raw = '{"reason":"policy wording: {limit} applies","ok":true}';
    expect(extractJsonObject(raw)).toEqual({ reason: 'policy wording: {limit} applies', ok: true });
  });

  it('handles escaped quotes inside strings', () => {
    const raw = '{"reason":"she said \\"use {brackets}\\" here","ok":true}';
    expect(extractJsonObject(raw)).toEqual({ reason: 'she said "use {brackets}" here', ok: true });
  });

  it('throws when no JSON object is present', () => {
    expect(() => extractJsonObject('no json here')).toThrow(/no JSON object/);
  });

  it('throws on unbalanced JSON', () => {
    expect(() => extractJsonObject('{"a": {"b": 1}')).toThrow(/unbalanced JSON/);
  });
});

describe('geminiTimeoutMs (stage override -> shared var -> stage default)', () => {
  const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;

  it('defaults to 8000 with nothing set', () => {
    expect(geminiTimeoutMs(env({}))).toBe(8000);
  });

  it('uses the shared GEMINI_TIMEOUT_MS when set', () => {
    expect(geminiTimeoutMs(env({ GEMINI_TIMEOUT_MS: '1234' }))).toBe(1234);
  });

  it('prefers a stage-specific override var over the shared var', () => {
    expect(
      geminiTimeoutMs(env({ GEMINI_TIMEOUT_MS: '1234', GEMINI_EXTRACTION_TIMEOUT_MS: '20000' }), 'GEMINI_EXTRACTION_TIMEOUT_MS', 15000),
    ).toBe(20000);
  });

  it('falls back to the stage default when neither var is set', () => {
    expect(geminiTimeoutMs(env({}), 'GEMINI_EXTRACTION_TIMEOUT_MS', 20000)).toBe(20000);
  });

  it('still honors the shared var for a stage with its own default', () => {
    expect(geminiTimeoutMs(env({ GEMINI_TIMEOUT_MS: '5000' }), 'GEMINI_EXTRACTION_TIMEOUT_MS', 20000)).toBe(5000);
  });
});
