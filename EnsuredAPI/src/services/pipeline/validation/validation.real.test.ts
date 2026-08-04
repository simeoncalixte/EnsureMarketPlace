import { geminiSemanticJudge } from './semanticAdapter';
import { SemanticInput } from './semantic';

/**
 * Real (non-mocked) semantic validation through the LangChain Gemini judge. Makes
 * a real, paid Gemini call, so it is OFF by default. Opt in:
 *
 *   RUN_REAL_LLM=1 GEMINI_API_KEY=... \
 *     npx jest src/pipeline/validation/validation.real.test.ts
 *
 * The default `npm test` run skips this suite — no network, no cost. (The mocked
 * path is covered by semanticAdapter.test.ts.)
 */
const RUN = process.env.RUN_REAL_LLM === '1';
const realDescribe = RUN ? describe : describe.skip;

realDescribe('real Gemini semantic validation judge (RUN_REAL_LLM=1)', () => {
  jest.setTimeout(60_000);

  it('returns a usable verdict for a submission against guidelines', async () => {
    const input: SemanticInput = {
      riskType: 'hurricane',
      limit: 5_000_000,
      expectedYield: 0.09,
      jurisdiction: 'Florida',
      lineOfBusiness: 'Commercial Property',
      dataQualityScore: 88,
      guidelines: 'Target US wind/hurricane property risks. Decline risks with limit over $50M or outside the US.',
      rules: ['Excluded jurisdictions: cuba, iran', 'Maximum coverage limit: 50000000'],
    };

    const verdict = await geminiSemanticJudge(input);

    // eslint-disable-next-line no-console
    console.log('[real validation]', JSON.stringify(verdict));
    expect(verdict).not.toBeNull();
    expect(['IN_APPETITE', 'FLAGGED', 'OUT_OF_APPETITE', 'ABSTAIN']).toContain(verdict!.decision);
    expect(verdict!.confidence).toBeGreaterThanOrEqual(0);
    expect(verdict!.confidence).toBeLessThanOrEqual(1);
  });
});
