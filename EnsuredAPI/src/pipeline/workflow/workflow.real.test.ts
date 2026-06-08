import { GeminiWorkflowAgent, ALLOWED_DECISIONS } from './GeminiWorkflowProvider';

/**
 * Real (non-mocked) triage decision through the LangChain Gemini agent. Makes a
 * real, paid Gemini call, so it is OFF by default. Opt in:
 *
 *   RUN_REAL_LLM=1 GEMINI_API_KEY=... \
 *     npx jest src/pipeline/workflow/workflow.real.test.ts
 *
 * The default `npm test` run skips this suite — no network, no cost.
 */
const RUN = process.env.RUN_REAL_LLM === '1';
const realDescribe = RUN ? describe : describe.skip;

realDescribe('real Gemini workflow triage (RUN_REAL_LLM=1)', () => {
  jest.setTimeout(60_000);
  const agent = new GeminiWorkflowAgent(process.env);

  it('is available with a Gemini key', () => {
    expect(agent.isAvailable()).toBe(true);
  });

  it('routes an out-of-appetite submission to a valid decision', async () => {
    const decision = await agent.decide({
      validation: { decision: 'OUT_OF_APPETITE', reasons: ['Risk type not in appetite'] },
      preRating: { grade: 'D', numericScore: 30 },
      oracleAttestation: { smartContractReady: false, reason: 'No compatible oracle source' },
      capacityMatch: { route: 'partner_pool' },
    });

    // eslint-disable-next-line no-console
    console.log('[real workflow]', JSON.stringify(decision));
    expect(ALLOWED_DECISIONS).toContain(decision.decision as (typeof ALLOWED_DECISIONS)[number]);
    expect(['modeling', 'rejected', 'submitted']).toContain(decision.suggestedSubmissionStatus);
    expect(decision.decision).toBe('OUT_OF_APPETITE'); // the rubric's top-priority rule
  });
});
