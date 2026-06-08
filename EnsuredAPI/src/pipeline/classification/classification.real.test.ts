import { GeminiClassificationAgent } from './GeminiClassificationProvider';

/**
 * Real (non-mocked) line-of-business classification through the LangChain Gemini
 * agent. Each case makes a real, paid Gemini call, so this suite is OFF by
 * default. Opt in explicitly:
 *
 *   RUN_REAL_LLM=1 GEMINI_API_KEY=... \
 *     npx jest src/pipeline/classification/classification.real.test.ts
 *
 * The default `npm test` run skips this suite — no network, no cost. Mirrors the
 * other guarded live suites (one per judgment stage), all gated by RUN_REAL_LLM.
 */
const RUN = process.env.RUN_REAL_LLM === '1';
const realDescribe = RUN ? describe : describe.skip;

const CASES = [
  {
    name: 'cyber submission',
    text:
      'Cyber liability insurance submission. The applicant suffered a ransomware extortion event with '
      + 'encryption of production systems, a data breach requiring customer notification and forensics, '
      + 'and network security failures impacting privacy of personal data.',
    expectCodes: ['cyber'],
  },
  {
    name: 'catastrophe property submission',
    text:
      'Commercial property insurance submission with a statement of values covering an office building and '
      + 'a warehouse located in Miami, Florida. Significant windstorm and hurricane catastrophe exposure, '
      + 'including storm surge and flood. Total insured value $50,000,000.',
    expectCodes: ['property', 'commercial_property', 'catastrophe_property'],
  },
];

realDescribe('real Gemini line-of-business classification (RUN_REAL_CLASSIFICATION=1)', () => {
  jest.setTimeout(60_000);
  const agent = new GeminiClassificationAgent(process.env);

  it('the agent is available with a Gemini key', () => {
    expect(agent.isAvailable()).toBe(true);
  });

  it.each(CASES)('classifies the $name into the expected line of business', async ({ text, expectCodes }) => {
    const result = await agent.classify({ text });

    // eslint-disable-next-line no-console
    console.log(
      `[real classification] code=${result.lineOfBusinessCode} (${result.lineOfBusinessLabel}) `
        + `sub=${result.lineOfBusinessSubTypeCode ?? '-'} conf=${result.confidence} `
        + `evidence=${JSON.stringify(result.evidence)}`,
    );

    expect(result.modelVersion).toMatch(/^lob-gemini:/);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(expectCodes).toContain(result.lineOfBusinessCode);
  });
});
