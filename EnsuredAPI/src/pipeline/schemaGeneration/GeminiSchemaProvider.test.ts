import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { GeminiSchemaAgent, buildSchemaMessages } from './GeminiSchemaProvider';
import { buildBaselineSchema, gatherContext } from './logic';

jest.mock('@langchain/google-genai');
const MockChat = ChatGoogleGenerativeAI as unknown as jest.Mock;
const invoke = jest.fn();
const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;

beforeEach(() => {
  MockChat.mockReset();
  invoke.mockReset();
  MockChat.mockImplementation(() => ({ invoke }));
});

const context = gatherContext({
  submission: { id: 1, organizationId: 1 },
  classification: { lineOfBusinessLabel: 'Property' },
  extraction: { structuredData: { riskType: 'hurricane', triggerType: 'parametric', subjectCount: 3, subjects: [{ label: 'A' }] } },
});
const baseline = buildBaselineSchema(context);

describe('GeminiSchemaAgent.isAvailable', () => {
  it('is available only when a Gemini key is set', () => {
    expect(new GeminiSchemaAgent(env({})).isAvailable()).toBe(false);
    expect(new GeminiSchemaAgent(env({ GEMINI_API_KEY: 'k' })).isAvailable()).toBe(true);
  });
});

describe('buildSchemaMessages', () => {
  it('presents data in fenced blocks, states the boundary before the data, and asks for the form JSON', () => {
    const { system, user } = buildSchemaMessages({ context, baseline });
    expect(system).toMatch(/untrusted DATA/i);
    expect(system).toMatch(/Extend an existing base data section/i);
    expect(system).toMatch(/SUB-TYPE/i);
    expect(system).toMatch(/currency/);
    // The data/instruction boundary is declared up front (in the system turn),
    // and the user turn fences both blocks.
    expect(system).toMatch(/<base_form>/);
    expect(system).toMatch(/<submission_facts>/);
    expect(user).toMatch(/<base_form>/);
    expect(user).toMatch(/<submission_facts>/);
    expect(user).toMatch(/parametric/);
  });

  it('bounds AI output growth with an explicit section/field budget', () => {
    const { system } = buildSchemaMessages({ context, baseline });
    expect(system).toMatch(/BUDGET/);
    expect(system).toMatch(/at most 6 new sections/);
    expect(system).toMatch(/at most 10 fields per section/);
  });

  it('makes the agent aware sections render as logically-separated tabs', () => {
    const { system } = buildSchemaMessages({ context, baseline });
    // Knows the rendering model: one tab per section.
    expect(system).toMatch(/tab/i);
    // Instructed to separate sections by a single theme and not fragment/cram.
    expect(system).toMatch(/ONE clear theme/i);
    expect(system).toMatch(/single-field or near-empty sections/i);
  });

  it('makes the agent taxonomy-aware: valid sub-type options in the facts, full catalog only when unrecognized', () => {
    const { system, user } = buildSchemaMessages({ context, baseline });
    // The system prompt constrains choice fields to the provided taxonomy.
    expect(system).toMatch(/lineOfBusinessSubTypeOptions/);
    expect(system).toMatch(/never invent such values/i);
    // The classified 'Property' line resolves its valid sub-types into the facts.
    const factsBlock = user.slice(user.indexOf('<submission_facts>') + '<submission_facts>'.length);
    const facts = JSON.parse(factsBlock.slice(factsBlock.indexOf('{'), factsBlock.lastIndexOf('}') + 1));
    expect(facts.lineOfBusinessRecognized).toBe(true);
    // Recognized LOB -> the (large) full primary catalog is NOT sent.
    expect(facts.lineOfBusinessOptions).toBeUndefined();
    expect(facts.lineOfBusinessSubTypeOptions.map((o: { code: string }) => o.code)).toContain('property_all_risk');
  });

  it('sends the full primary catalog when the classified line of business is unrecognized', () => {
    const unknownContext = gatherContext({
      submission: { id: 2, organizationId: 1 },
      classification: { lineOfBusinessLabel: 'Quantum Widget Cover' },
      extraction: { structuredData: {} },
    });
    const { user } = buildSchemaMessages({ context: unknownContext, baseline: buildBaselineSchema(unknownContext) });
    const factsBlock = user.slice(user.indexOf('<submission_facts>') + '<submission_facts>'.length);
    const facts = JSON.parse(factsBlock.slice(factsBlock.indexOf('{'), factsBlock.lastIndexOf('}') + 1));
    expect(facts.lineOfBusinessRecognized).toBe(false);
    expect(facts.lineOfBusinessOptions).toContainEqual({ code: 'property', label: 'Property' });
  });
});

describe('GeminiSchemaAgent.generate (mocked model)', () => {
  const agent = () => new GeminiSchemaAgent(env({ GEMINI_API_KEY: 'secret', GEMINI_MODEL: 'test-model' }));

  it('coerces the model JSON and grafts back baseline sections', async () => {
    invoke.mockResolvedValue({
      content: JSON.stringify({
        title: 'Custom',
        sections: [
          { key: 'parametric', label: 'Parametric', fields: [{ key: 'oracle', label: 'Oracle', type: 'text' }] },
        ],
      }),
    });

    const schema = await agent().generate({ context, baseline });
    const keys = schema.sections.map((s) => s.key);
    expect(keys).toContain('parametric'); // new AI section
    // base sections preserved
    expect(keys).toContain('general-information');
    expect(keys).toContain('insured-subjects');
    expect(MockChat).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'secret', model: 'test-model', json: true }));
  });

  it('returns the baseline when the model emits junk (coercion fallback)', async () => {
    invoke.mockResolvedValue({ content: 'totally not json {' });
    await expect(agent().generate({ context, baseline })).rejects.toThrow(); // no JSON object -> extractJsonObject throws
  });
});
