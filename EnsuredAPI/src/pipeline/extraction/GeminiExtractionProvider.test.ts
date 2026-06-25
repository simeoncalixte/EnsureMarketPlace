import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { GeminiExtractionAgent, coerceEntities, coerceSubjects, deriveInsuredSubject } from './GeminiExtractionProvider';

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
    // No insured named in this JSON, but the subject is always derived.
    expect(e.namedInsured).toBeNull();
    expect(e.insuredSubject).toBe('Hurricane risk at Miami, FL');
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
    expect(e.inputTruncated).toBe(false);
  });

  it('does NOT backfill subjectCount from the enumerated list on truncated input', () => {
    // The model only saw a slice of the schedule: a missing stated total must
    // stay null, not become a confident undercount from the visible items.
    const e = coerceEntities(
      { subjects: [{ label: 'Site 1', insuredValue: 100 }, { label: 'Site 2', insuredValue: 200 }] },
      { inputTruncated: true },
    );
    expect(e.subjects).toHaveLength(2);
    expect(e.subjectCount).toBeNull();
    expect(e.inputTruncated).toBe(true);
  });

  it('still honors a stated subjectCount on truncated input', () => {
    const e = coerceEntities(
      { subjectCount: 140, subjects: [{ label: 'Site 1', insuredValue: 100 }] },
      { inputTruncated: true },
    );
    expect(e.subjectCount).toBe(140);
  });

  it('reads yields in (1, 100] as percents and drops implausible values above 100', () => {
    expect(coerceEntities({ riskType: 'x', expectedYield: 9 }).expectedYield).toBeCloseTo(0.09);
    expect(coerceEntities({ riskType: 'x', expectedYield: 1 }).expectedYield).toBe(1); // exactly 100%
    expect(coerceEntities({ riskType: 'x', expectedYield: 250 }).expectedYield).toBeNull();
  });
});

describe('the insured + subject of insurance (present for every submission)', () => {
  it('captures an explicit named insured and insured-subject from the model', () => {
    const e = coerceEntities({
      namedInsured: 'ACME Manufacturing Inc.',
      insuredSubject: 'commercial warehouse and stored contents',
      limit: 5_000_000,
    });
    expect(e.namedInsured).toBe('ACME Manufacturing Inc.');
    expect(e.insuredSubject).toBe('commercial warehouse and stored contents');
  });

  it('derives an insured-subject from a single risk when the model omits it', () => {
    const e = coerceEntities({ riskType: 'flood', propertyLocation: '500 Bay St, Tampa, FL' });
    expect(e.insuredSubject).toBe('flood risk at 500 Bay St, Tampa, FL');
  });

  it('summarizes a portfolio into the insured-subject', () => {
    const e = coerceEntities({
      riskType: 'hurricane',
      subjectCount: 3,
      subjects: [
        { label: 'Site A', assetType: 'building', insuredValue: 1_000_000 },
        { label: 'Site B', assetType: 'building', insuredValue: 1_000_000 },
        { label: 'Site C', assetType: 'building', insuredValue: 1_000_000 },
      ],
    });
    expect(e.insuredSubject).toBe('Portfolio of 3 building items (hurricane)');
  });
});

describe('deriveInsuredSubject', () => {
  it('prefers an explicit value verbatim', () => {
    expect(deriveInsuredSubject({ insuredSubject: 'offshore wind farm' })).toBe('offshore wind farm');
  });

  it('describes a single itemized subject from its own fields', () => {
    expect(
      deriveInsuredSubject({ subjects: [{ label: 'Vessel Aurora', assetType: 'vehicle', location: 'Port of Miami', constructionType: null, occupancyType: null, riskType: null, insuredValue: null, limit: null }] }),
    ).toBe('Vessel Aurora — vehicle — Port of Miami');
  });

  it('returns null when there is no signal at all', () => {
    expect(deriveInsuredSubject({})).toBeNull();
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
