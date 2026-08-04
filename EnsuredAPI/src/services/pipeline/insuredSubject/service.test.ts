import Fastify from 'fastify';
import { insuredSubjectRoute } from '../../../routes/pipeline/insuredSubject';
import { buildSubjectFieldDefinitions, extractInsuredSubjects, InsuredSubjectService, mergeSubjectFieldsIntoPageTemplate } from './service';
import { buildDefaultInsuredSubjectsPageDefinition } from '../../../db/seed-data/pageTemplates';
import type { InsuredSubjectAgent, InsuredSubjectInput } from './GeminiInsuredSubjectProvider';

describe('Insured-subject pipeline routes', () => {
  let app: any;
  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(insuredSubjectRoute, { prefix: '/api' });
    await app.ready();
  });
  afterAll(async () => {
    if (app && typeof app.close === 'function') await app.close();
  });

  test('GET /api/pipeline/insured-subject/health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/pipeline/insured-subject/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ status: 'ok', service: 'insuredSubject' });
  });
});

describe('extractInsuredSubjects (pure heuristic)', () => {
  test('builds one subject per extracted SOV location, carrying its attributes', () => {
    const result = extractInsuredSubjects({
      hints: {
        subjects: [
          { name: 'Bldg A', address: '123 Coast Rd, Miami, FL', tiv: 5000000, constructionType: 'Masonry', yearBuilt: 1998 },
          { name: 'Bldg B', address: '50 Harbor St, Tampa, FL', tiv: 2500000, occupancy: 'Warehouse' },
        ],
      },
    });

    expect(result.source).toBe('heuristic');
    expect(result.subjectCount).toBe(2);
    expect(result.subjects[0]).toMatchObject({
      index: 0,
      name: 'Bldg A',
      subjectType: 'property_location',
      address: '123 Coast Rd, Miami, FL',
    });
    // Arbitrary per-subject key-value pairs are preserved (normalized keys).
    expect(result.subjects[0].attributes.tiv).toBe(5000000);
    expect(result.subjects[0].attributes.construction_type).toBe('Masonry');
    expect(result.subjects[0].attributes.year_built).toBe(1998);
    expect(result.subjects[1].attributes.occupancy).toBe('Warehouse');
  });

  test('synthesises a single subject and harvests SOV key-value lines from the text', () => {
    const result = extractInsuredSubjects({
      hints: { insuredSubject: 'Acme HQ', propertyLocation: '1 Market St, San Francisco, CA', limit: 10000000 },
      text: [
        'Construction Type: Fire Resistive',
        'Year Built: 2015',
        'Number of Stories: 12',
        'Sprinklered: Yes',
      ].join('\n'),
    });

    expect(result.subjectCount).toBe(1);
    const subject = result.subjects[0];
    expect(subject.name).toBe('Acme HQ');
    expect(subject.address).toBe('1 Market St, San Francisco, CA');
    expect(subject.attributes.total_insured_value).toBe(10000000);
    expect(subject.attributes.construction_type).toBe('Fire Resistive');
    expect(subject.attributes.year_built).toBe('2015');
    expect(subject.attributes.number_of_stories).toBe('12');
    expect(subject.attributes.sprinklered).toBe('Yes');
  });

  test('abstains (empty set) when there is nothing to anchor a subject on', () => {
    const result = extractInsuredSubjects({ text: 'zzqx 8812 vortma', hints: {} });
    expect(result.subjectCount).toBe(0);
    expect(result.subjects).toEqual([]);
  });

  test('records a DISTINCT line of business per subject for a multi-LOB package', () => {
    const result = extractInsuredSubjects({
      hints: {
        subjects: [
          { name: 'Sterling Maritime LLC', lineOfBusiness: 'Directors and Officers' },
          { name: 'Acme Tech Co', lineOfBusiness: 'Cyber' },
          { name: 'Skyline Air', lineOfBusiness: 'Aviation' },
        ],
      },
    });

    // Each subject keeps its OWN line of business.
    expect(result.subjects[0].lineOfBusinessCode).toBe('directors_officers');
    expect(result.subjects[1].lineOfBusinessCode).toBe('cyber');
    expect(result.subjects[2].lineOfBusinessCode).toBe('aviation');

    // The submission records every distinct line of business.
    const codes = result.linesOfBusiness.map((lob) => lob.code).sort();
    expect(codes).toEqual(['aviation', 'cyber', 'directors_officers']);
    expect(result.linesOfBusiness.every((lob) => lob.subjectCount === 1)).toBe(true);
  });
});

describe('InsuredSubjectService.process (no persistence)', () => {
  test('returns the structured stage contract for ad-hoc input', async () => {
    const svc = new InsuredSubjectService({
      insuredSubjectAgent: { isAvailable: () => false } as InsuredSubjectAgent,
    });
    const result = await svc.process({
      extraction: { structuredData: { subjects: [{ name: 'Vessel Aurora', subjectType: 'vessel', hullNumber: 'HX-2231' }] } },
    });

    expect(result.ok).toBe(true);
    expect(result.service).toBe('insuredSubject');
    expect(result.subjectCount).toBe(1);
    expect(Array.isArray(result.subjects)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  test('falls back to the heuristic (with a warning) when the agent throws', async () => {
    const flakyAgent: InsuredSubjectAgent = {
      isAvailable: () => true,
      extract: async (_input: InsuredSubjectInput) => {
        throw new Error('gemini boom');
      },
    };
    const svc = new InsuredSubjectService({ insuredSubjectAgent: flakyAgent });
    const result = await svc.process({
      ocr: { text: 'Building Value: 4,000,000' },
      extraction: { structuredData: { insuredSubject: 'Riverside Plant', propertyLocation: '9 Mill Rd' } },
    });

    expect(result.ok).toBe(true);
    expect(result.subjectCount).toBe(1);
    expect(result.warnings).toHaveLength(1);
    expect(String((result.warnings as string[])[0])).toMatch(/agent failed/i);
  });
});

describe('buildSubjectFieldDefinitions', () => {
  test('builds AI-origin field definitions from non-location attributes and model suggestions', () => {
    const fields = buildSubjectFieldDefinitions(
      { attributes: { city: 'Miami', total_insured_value: 5_000_000, occupancy: 'Office' } },
      [
        { key: 'full_address', label: 'Risk Address', type: 'text' },
        { key: 'occupancy', label: 'Occupancy', type: 'text' },
        { key: 'construction_type', label: 'Construction Type', type: 'select' },
      ],
    );

    expect(fields.map((field) => field.key)).toEqual(['occupancy', 'construction_type', 'total_insured_value']);
    expect(fields.every((field) => field.origin === 'ai')).toBe(true);
    expect(fields.every((field) => field.defaultValue === undefined)).toBe(true);
    expect(fields.find((field) => field.key === 'full_address')).toBeUndefined();
    expect(fields.find((field) => field.key === 'city')).toBeUndefined();
  });
});

describe('mergeSubjectFieldsIntoPageTemplate', () => {
  test('promotes subject detail fields into the reusable template without storing submission values', () => {
    const base = buildDefaultInsuredSubjectsPageDefinition();
    const fields = buildSubjectFieldDefinitions({
      attributes: { city: 'Miami', total_insured_value: 5_000_000, occupancy: 'Office' },
    });

    const { template, changed } = mergeSubjectFieldsIntoPageTemplate(base, fields);

    expect(changed).toBe(true);
    expect(template.pageKey).toBe('insured-subjects');

    const details = template.sections.find((section) => section.key === 'insured-subject-details');
    expect(details).toBeDefined();
    expect(details!.fields.map((field) => field.key)).toEqual(['total_insured_value', 'occupancy']);
    expect(details!.fields.every((field) => field.origin === 'ai')).toBe(true);
    expect(details!.fields.every((field) => field.defaultValue === undefined)).toBe(true);
  });

  test('does not add a duplicate field when the reusable template already has the same normalized identity', () => {
    const base = buildDefaultInsuredSubjectsPageDefinition();
    base.sections.push({
      key: 'insured-subject-details',
      label: 'Subject Details',
      order: 100,
      fields: [
        {
          key: 'constructionType',
          label: 'Construction Type',
          type: 'text',
          order: 10,
          canonicalKey: 'constructionType',
          origin: 'ai',
        },
      ],
    });
    const fields = buildSubjectFieldDefinitions({
      attributes: { construction_type: 'Masonry', occupancy: 'Office' },
    });

    const { template, changed } = mergeSubjectFieldsIntoPageTemplate(base, fields);
    const details = template.sections.find((section) => section.key === 'insured-subject-details')!;

    expect(changed).toBe(true);
    expect(details.fields.map((field) => field.key)).toEqual(['constructionType', 'occupancy']);
  });
});
