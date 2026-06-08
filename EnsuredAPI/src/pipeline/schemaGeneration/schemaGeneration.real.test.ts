import { GeminiSchemaAgent } from './GeminiSchemaProvider';
import { buildBaselineSchema, gatherContext } from './logic';

/**
 * Real (non-mocked) form-schema generation through the LangChain Gemini agent.
 * Makes a real, paid Gemini call, so it is OFF by default. Opt in:
 *
 *   RUN_REAL_LLM=1 GEMINI_API_KEY=... \
 *     npx jest src/pipeline/schemaGeneration/schemaGeneration.real.test.ts
 *
 * The default `npm test` run skips this suite — no network, no cost.
 */
const RUN = process.env.RUN_REAL_LLM === '1';
const realDescribe = RUN ? describe : describe.skip;

realDescribe('real Gemini schema generation (RUN_REAL_LLM=1)', () => {
  jest.setTimeout(60_000);

  it('enriches the baseline form for a parametric property portfolio', async () => {
    const payload = {
      submission: { id: 1, tenantId: 1 },
      classification: { lineOfBusinessCode: 'property', lineOfBusinessLabel: 'Property', lineOfBusinessSubTypeLabel: 'Commercial Property' },
      extraction: {
        structuredData: {
          limit: 12_000_000,
          riskType: 'hurricane',
          triggerType: 'parametric',
          expectedYield: 0.09,
          subjectCount: 3,
          subjects: [
            { label: 'Warehouse A', assetType: 'building', location: 'Miami, FL', insuredValue: 5_000_000 },
            { label: 'Office HQ', assetType: 'building', location: 'Tampa, FL', insuredValue: 4_000_000 },
            { label: 'Retail Annex', assetType: 'building', location: 'Orlando, FL', insuredValue: 3_000_000 },
          ],
        },
      },
      validation: { decision: 'PASS', schemaValidation: { missingRequired: [] } },
    };

    const context = gatherContext(payload);
    const baseline = buildBaselineSchema(context);
    const schema = await new GeminiSchemaAgent(process.env).generate({ context, baseline });
    // eslint-disable-next-line no-console
    console.log('[real schema]', JSON.stringify(schema, null, 2));

    const keys = schema.sections.map((s) => s.key);
    // All 7 base sections are always preserved.
    for (const baseKey of ['deal-parameters', 'financials', 'insured-subjects', 'tranche-structure', 'validation', 'submission', 'signing']) {
      expect(keys).toContain(baseKey);
    }
    // The Subjects section is component-rendered.
    expect(schema.sections.find((s) => s.key === 'insured-subjects')?.component).toBe('subjects');
    // The model should EXTEND the base — either new AI fields on a data section or a new AI section.
    const aiFields = schema.sections.flatMap((s) => s.fields).filter((f) => f.origin === 'ai');
    const aiSections = schema.sections.filter((s) => s.origin === 'ai');
    expect(aiFields.length + aiSections.length).toBeGreaterThan(0);
  });
});
