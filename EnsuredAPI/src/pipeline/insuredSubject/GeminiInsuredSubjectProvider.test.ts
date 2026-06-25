import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { GeminiInsuredSubjectAgent } from './GeminiInsuredSubjectProvider';

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

describe('GeminiInsuredSubjectAgent.isAvailable (LLM-primary: key present)', () => {
  it('available when a Gemini key is set, off otherwise', () => {
    expect(new GeminiInsuredSubjectAgent(env({})).isAvailable()).toBe(false);
    expect(new GeminiInsuredSubjectAgent(env({ GEMINI_API_KEY: 'k' })).isAvailable()).toBe(true);
  });
});

describe('GeminiInsuredSubjectAgent.extract (mocked model, no live request)', () => {
  const agent = () => new GeminiInsuredSubjectAgent(env({ GEMINI_API_KEY: 'secret', GEMINI_MODEL: 'test-model' }));

  it('maps subjects with open-ended attributes and normalizes attribute keys', async () => {
    invoke.mockResolvedValue({
      content: JSON.stringify({
        subjects: [
          {
            name: 'Building A',
            subjectType: 'property_location',
            address: '123 Coast Rd, Miami, FL',
            attributes: { 'Total Insured Value': 5000000, 'Construction Type': 'Masonry', 'Year Built': 1998 },
          },
        ],
      }),
    });

    const result = await agent().extract({ text: 'SOV with one location' });

    expect(result.source).toBe('gemini_insured_subjects');
    expect(result.modelVersion).toBe('insured-subjects-gemini:test-model:p5');
    expect(result.subjectCount).toBe(1);
    expect(result.subjects[0]).toMatchObject({ index: 0, name: 'Building A', subjectType: 'property_location', address: '123 Coast Rd, Miami, FL' });
    expect(result.subjects[0].attributes.total_insured_value).toBe(5000000);
    expect(result.subjects[0].attributes.construction_type).toBe('Masonry');
    expect(MockChat).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'secret', model: 'test-model', json: true }));

    // With no model-proposed `fields`, the per-subject template is synthesised
    // from the harvested attributes — one prefilled field per attribute key, in
    // the Subject Details section (the standardized Location section leads).
    const template = result.subjects[0].template;
    expect(template).toBeTruthy();
    const location = template!.sections.find((s) => s.key === 'insured-subject-location');
    expect(location?.fields.find((f) => f.key === 'address_line1')?.defaultValue).toBe('123 Coast Rd, Miami, FL');
    const fields = template!.sections.find((s) => s.key !== 'insured-subject-location')!.fields;
    const tiv = fields.find((f) => f.key === 'total_insured_value');
    expect(tiv).toMatchObject({ type: 'number', canonicalKey: 'total_insured_value', defaultValue: 5000000 });
    expect(fields.find((f) => f.key === 'construction_type')).toMatchObject({ type: 'text' });
  });

  it('builds the per-subject template from the model-proposed fields, prefilled and missing-field-aware', async () => {
    invoke.mockResolvedValue({
      content: JSON.stringify({
        subjects: [
          {
            name: 'Building A',
            lineOfBusinessCode: 'property',
            attributes: { total_insured_value: 5000000 },
            fields: [
              { key: 'total_insured_value', label: 'TIV', type: 'currency', required: true },
              { key: 'construction_type', label: 'Construction Type', type: 'select' },
            ],
          },
        ],
      }),
    });

    const result = await agent().extract({ text: 'one building' });
    const fields = result.subjects[0].template!.sections[0].fields;

    // Model field order is preserved; money type maps to number; value prefilled.
    expect(fields.map((f) => f.key)).toEqual(['total_insured_value', 'construction_type']);
    expect(fields[0]).toMatchObject({ label: 'TIV', type: 'number', required: true, defaultValue: 5000000 });
    // A standard field the submission is MISSING is still surfaced (no value).
    expect(fields[1]).toMatchObject({ label: 'Construction Type', type: 'select' });
    expect(fields[1].defaultValue).toBeNull();
  });

  it('classifies a line of business PER subject and aggregates the distinct set', async () => {
    invoke.mockResolvedValue({
      content: JSON.stringify({
        subjects: [
          { name: 'Sterling Maritime LLC', lineOfBusinessCode: 'directors_officers', attributes: { limit: 9000000 } },
          { name: 'Cascade Cargo', lineOfBusinessCode: 'cargo', attributes: { tiv: 36000000 } },
          { name: 'Made Up', lineOfBusinessCode: 'not_a_real_lob', attributes: { tiv: 1 } },
        ],
      }),
    });

    const result = await agent().extract({ text: 'multi-LOB package' });

    expect(result.subjects[0].lineOfBusinessCode).toBe('directors_officers');
    expect(result.subjects[0].lineOfBusinessLabel).toBeTruthy();
    expect(result.subjects[1].lineOfBusinessCode).toBe('cargo');
    // An invalid code is dropped to null, not trusted.
    expect(result.subjects[2].lineOfBusinessCode).toBeNull();

    const codes = result.linesOfBusiness.map((lob) => lob.code).sort();
    expect(codes).toEqual(['cargo', 'directors_officers']);
  });

  it('applies context-relevant perils per subject, validating against the taxonomy', async () => {
    invoke.mockResolvedValue({
      content: JSON.stringify({
        subjects: [
          {
            name: 'Gulf Coast Warehouse',
            subjectType: 'property_location',
            address: '900 Harbor Rd, Galveston, TX',
            // mix of valid codes, a duplicate, a bogus code, and a non-string
            perilCodes: ['hurricane', 'storm_surge', 'HURRICANE', 'not_a_real_peril', 42, 'fire'],
            attributes: { tiv: 8000000 },
          },
          {
            name: 'Sterling D&O',
            lineOfBusinessCode: 'directors_officers',
            perilCodes: [],
            attributes: { limit: 9000000 },
          },
        ],
      }),
    });

    const result = await agent().extract({ text: 'coastal warehouse + D&O' });

    // Known codes kept (case-normalized + de-duplicated); unknown/non-string dropped.
    expect(result.subjects[0].perilCodes).toEqual(['hurricane', 'storm_surge', 'fire']);
    // A subject with no applicable perils carries an explicit empty list, not a guess.
    expect(result.subjects[1].perilCodes).toEqual([]);
  });

  it('drops empty/info-less subjects', async () => {
    invoke.mockResolvedValue({
      content: JSON.stringify({ subjects: [{ name: 'Real', attributes: { tiv: 100 } }, { name: '', attributes: {} }] }),
    });
    const result = await agent().extract({ text: 'whatever' });
    expect(result.subjectCount).toBe(1);
    expect(result.subjects[0].name).toBe('Real');
  });

  it('maps an abstention (empty subjects) to an empty set, not a guess', async () => {
    invoke.mockResolvedValue({ content: JSON.stringify({ subjects: [] }) });
    const result = await agent().extract({ text: 'not an insurance document' });
    expect(result.subjectCount).toBe(0);
    expect(result.subjects).toEqual([]);
  });

  it('throws on empty text WITHOUT calling the model', async () => {
    await expect(agent().extract({ text: '   ' })).rejects.toThrow(/no text to extract/);
    expect(invoke).not.toHaveBeenCalled();
  });
});
