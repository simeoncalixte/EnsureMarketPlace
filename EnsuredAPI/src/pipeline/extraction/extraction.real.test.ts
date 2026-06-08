import { GeminiExtractionAgent } from './GeminiExtractionProvider';

/**
 * Real (non-mocked) entity extraction through the LangChain Gemini agent. Makes a
 * real, paid Gemini call, so it is OFF by default. Opt in:
 *
 *   RUN_REAL_LLM=1 GEMINI_API_KEY=... \
 *     npx jest src/pipeline/extraction/extraction.real.test.ts
 *
 * The default `npm test` run skips this suite — no network, no cost.
 */
const RUN = process.env.RUN_REAL_LLM === '1';
const realDescribe = RUN ? describe : describe.skip;

const SUBMISSION_TEXT =
  'Commercial cyber insurance submission for Beta Manufacturing Inc. '
  + 'Coverage limit: $10,000,000. Deductible: $250,000. Effective date: 2026-04-01. '
  + 'Target yield 8.5%. Peril: cyber ransomware. Settlement trigger: indemnity. '
  + 'Company website: betamanufacturing.example.';

realDescribe('real Gemini entity extraction (RUN_REAL_LLM=1)', () => {
  jest.setTimeout(60_000);
  const agent = new GeminiExtractionAgent(process.env);

  it('is available with a Gemini key', () => {
    expect(agent.isAvailable()).toBe(true);
  });

  it('extracts the structured underwriting fields', async () => {
    const e = await agent.extract({ text: SUBMISSION_TEXT });
    // eslint-disable-next-line no-console
    console.log('[real extraction]', JSON.stringify(e));

    expect(e.limit).toBe(10_000_000);
    expect(typeof e.riskType).toBe('string');
    expect((e.riskType ?? '').toLowerCase()).toContain('cyber');
    expect(e.expectedYield).not.toBeNull();
    expect(e.expectedYield as number).toBeGreaterThan(0);
    expect(e.expectedYield as number).toBeLessThan(1);
  });

  it('enumerates a portfolio schedule of values into subjects', async () => {
    const portfolioText =
      'Property schedule — Acme Holdings commercial property program. '
      + 'Blanket limit $9,000,000. Peril: named windstorm. Locations:\n'
      + '1. Warehouse A, 100 Dock Rd, Miami FL — steel, industrial — TIV $4,000,000\n'
      + '2. Office HQ, 200 Bayshore Blvd, Tampa FL — concrete, commercial — TIV $3,000,000\n'
      + '3. Retail Annex, 50 Main St, Orlando FL — masonry, commercial — TIV $2,000,000';

    const e = await agent.extract({ text: portfolioText });
    // eslint-disable-next-line no-console
    console.log('[real extraction portfolio]', JSON.stringify(e));

    expect(e.subjects.length).toBeGreaterThanOrEqual(3);
    expect(e.subjectCount).toBeGreaterThanOrEqual(3);
    const labels = e.subjects.map((s) => (s.label ?? '').toLowerCase()).join(' ');
    expect(labels).toContain('warehouse');
    expect(e.subjects.some((s) => (s.insuredValue ?? 0) > 0)).toBe(true);
  });
});
