import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { GeminiExtractionAgent, coerceEntities, coerceSubjects } from './GeminiExtractionProvider';

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

describe('GeminiExtractionAgent.isAvailable (LLM-primary: key present)', () => {
  it('available only when a Gemini key is set', () => {
    expect(new GeminiExtractionAgent(env({})).isAvailable()).toBe(false);
    expect(new GeminiExtractionAgent(env({ GEMINI_API_KEY: 'k' })).isAvailable()).toBe(true);
  });
});

describe('GeminiExtractionAgent.extract (mocked model, no live request)', () => {
  const agent = () => new GeminiExtractionAgent(env({ GEMINI_API_KEY: 'secret', GEMINI_MODEL: 'test-model' }));

  it('maps and coerces the model JSON into the entity shape', async () => {
    invoke.mockResolvedValue({
      content: JSON.stringify({
        limit: '5,000,000',
        deductible: 250000,
        effectiveDate: '2026-01-15',
        expectedYield: 9, // percent -> coerced to 0.09
        riskType: 'Hurricane',
        triggerType: 'parametric',
        propertyLocation: 'Miami, FL',
        companyDomain: 'acme.example',
        oracleDataSource: 'NOAA',
      }),
    });

    const e = await agent().extract({ text: 'some submission text' });

    expect(e.limit).toBe(5_000_000);
    expect(e.deductible).toBe(250_000);
    expect(e.expectedYield).toBeCloseTo(0.09);
    expect(e.riskType).toBe('Hurricane');
    expect(e.companyDomain).toBe('acme.example');
    expect(MockChat).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'secret', model: 'test-model', json: true }));
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('throws when the model returns no usable fields (caller falls back)', async () => {
    invoke.mockResolvedValue({ content: JSON.stringify({ limit: null, riskType: null }) });
    await expect(agent().extract({ text: 'x' })).rejects.toThrow(/no usable fields/);
  });

  it('throws on empty text WITHOUT calling the model', async () => {
    await expect(agent().extract({ text: '   ' })).rejects.toThrow(/no text to extract/);
    expect(invoke).not.toHaveBeenCalled();
  });
});

describe('coerceEntities', () => {
  it('keeps a fractional yield as-is and strips currency formatting', () => {
    const e = coerceEntities({ limit: '$1,200,000', expectedYield: 0.07, riskType: 'cyber' });
    expect(e.limit).toBe(1_200_000);
    expect(e.expectedYield).toBeCloseTo(0.07);
    expect(e.deductible).toBeNull();
  });

  it('defaults to an empty portfolio when no subjects are present', () => {
    const e = coerceEntities({ limit: 1_000_000, riskType: 'flood' });
    expect(e.subjects).toEqual([]);
    expect(e.subjectCount).toBeNull();
  });

  it('parses an itemized schedule of values into subjects', () => {
    const e = coerceEntities({
      limit: '10,000,000',
      riskType: 'hurricane',
      subjectCount: 2,
      subjects: [
        { label: 'Warehouse #3', assetType: 'Building', constructionType: 'Steel', occupancyType: 'Industrial', location: 'Miami, FL', insuredValue: '6,000,000' },
        { label: 'HQ Office', assetType: 'building', occupancyType: 'commercial', location: 'Tampa, FL', insuredValue: 4_000_000, limit: '4,000,000' },
      ],
    });
    expect(e.subjectCount).toBe(2);
    expect(e.subjects).toHaveLength(2);
    expect(e.subjects[0]).toMatchObject({
      label: 'Warehouse #3',
      assetType: 'building',
      constructionType: 'steel',
      occupancyType: 'industrial',
      insuredValue: 6_000_000,
    });
    expect(e.subjects[1].limit).toBe(4_000_000);
  });

  it('treats a portfolio with all top-level scalars null as a usable extraction', () => {
    const e = coerceEntities({ subjects: [{ label: 'Vessel Aurora', insuredValue: 2_500_000 }] });
    expect(e.subjects).toHaveLength(1);
    expect(e.subjectCount).toBe(1); // falls back to the enumerated count
  });
});

describe('coerceSubjects', () => {
  it('drops empty/garbage subjects and falls back unknown enums to null', () => {
    const subjects = coerceSubjects([
      { label: 'Fleet truck 12', assetType: 'vehicle', constructionType: 'titanium' },
      {}, // empty -> dropped
      { location: null, insuredValue: null }, // no info -> dropped
    ]);
    expect(subjects).toHaveLength(1);
    expect(subjects[0].assetType).toBe('vehicle');
    expect(subjects[0].constructionType).toBeNull(); // not in the allowed set
  });

  it('returns [] for a non-array', () => {
    expect(coerceSubjects(undefined)).toEqual([]);
    expect(coerceSubjects('nope')).toEqual([]);
  });
});
