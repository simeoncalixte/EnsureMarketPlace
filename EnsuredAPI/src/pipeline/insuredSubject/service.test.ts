import Fastify from 'fastify';
import { insuredSubjectRoute } from './route';
import { buildSubjectTemplate, extractInsuredSubjects, InsuredSubjectService } from './service';
import { STANDARD_LOCATION_SECTION_KEY } from './locationFields';
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

describe('buildSubjectTemplate — standardized location structure', () => {
  const locationSection = (tpl: ReturnType<typeof buildSubjectTemplate>) =>
    tpl.sections.find((s) => s.key === STANDARD_LOCATION_SECTION_KEY);
  const detailsFields = (tpl: ReturnType<typeof buildSubjectTemplate>) =>
    tpl.sections.find((s) => s.key !== STANDARD_LOCATION_SECTION_KEY)?.fields.map((f) => f.key) ?? [];

  test('emits the canonical structured location section (no free-form address), folding components and laying it out on a grid', () => {
    const tpl = buildSubjectTemplate({
      name: 'Bldg A',
      subjectType: 'property_location',
      address: '123 Coast Rd, Miami, FL',
      lineOfBusinessLabel: 'Property',
      attributes: { city: 'Miami', state_province: 'FL', zip: '33101', country: 'US', tiv: 5_000_000 },
    });

    const loc = locationSection(tpl);
    expect(loc).toBeDefined();
    // Discrete, structured fields only — no free-form textarea address.
    expect(loc!.fields.some((f) => f.type === 'textarea')).toBe(false);
    expect(loc!.fields.map((f) => f.canonicalKey)).toEqual([
      'line1', 'line2', 'city', 'state', 'postalCode', 'countryCode', 'latitude', 'longitude',
    ]);
    const byKey = Object.fromEntries(loc!.fields.map((f) => [f.key, f.defaultValue]));
    expect(byKey.address_line1).toBe('123 Coast Rd, Miami, FL'); // raw address seeds the street line
    expect(byKey.city).toBe('Miami');
    expect(byKey.state_province).toBe('FL');
    expect(byKey.postal_code).toBe('33101'); // `zip` alias folded in
    expect(byKey.country_code).toBe('US');   // `country` alias folded in
    // Laid out as a 3-column grid with explicit per-field placement.
    expect(loc!.layout?.columns).toBe(3);
    expect(loc!.fields.every((f) => f.layout?.columnStart && f.layout?.rowStart)).toBe(true);
    expect(loc!.fields.find((f) => f.key === 'address_line1')!.layout).toMatchObject({ columnSpan: 2, rowStart: 1 });
    expect(loc!.order).toBeLessThan(tpl.sections.find((s) => s.key !== STANDARD_LOCATION_SECTION_KEY)!.order);
  });

  test('lays the Subject Details fields out on a grid (compact, explicit placement)', () => {
    const tpl = buildSubjectTemplate({
      name: 'Bldg A',
      subjectType: 'property_location',
      address: null,
      lineOfBusinessLabel: 'Property',
      attributes: { tiv: 5_000_000, construction_type: 'Masonry', year_built: 1998, occupancy: 'Office' },
    });
    const details = tpl.sections.find((s) => s.key !== STANDARD_LOCATION_SECTION_KEY)!;
    expect(details.layout?.type).toBe('grid');
    expect(details.layout?.columns).toBeGreaterThanOrEqual(2);
    expect(details.fields.every((f) => f.layout?.columnStart && f.layout?.rowStart)).toBe(true);
  });

  test('keeps location OUT of the generic Subject Details section (no duplicate ad-hoc fields)', () => {
    const tpl = buildSubjectTemplate(
      {
        name: 'Bldg A',
        subjectType: 'property_location',
        address: '50 Harbor St, Tampa, FL',
        lineOfBusinessLabel: 'Property',
        attributes: { city: 'Tampa', occupancy: 'Warehouse' },
      },
      // A model that tries to spawn its own ad-hoc location fields — must be ignored.
      [
        { key: 'full_address', label: 'Risk Address', type: 'text' },
        { key: 'zip_code', label: 'ZIP', type: 'text' },
        { key: 'occupancy', label: 'Occupancy', type: 'text' },
      ],
    );

    const details = detailsFields(tpl);
    expect(details).toContain('occupancy');
    // None of the location-ish keys leak into the details section.
    expect(details).not.toContain('full_address');
    expect(details).not.toContain('zip_code');
    expect(details).not.toContain('city');
  });

  test('shows the empty standard block for a location-bearing subject with no extracted location', () => {
    const tpl = buildSubjectTemplate({
      name: 'Vessel Aurora',
      subjectType: 'vessel',
      address: null,
      lineOfBusinessLabel: 'Marine',
      attributes: { hull_number: 'HX-2231' },
    });
    expect(locationSection(tpl)).toBeDefined();
  });

  test('omits the location block for a non-location subject with no location data', () => {
    const tpl = buildSubjectTemplate({
      name: 'Acme Holdings Inc',
      subjectType: 'entity',
      address: null,
      lineOfBusinessLabel: 'Directors & Officers',
      attributes: { revenue: 12_000_000 },
    });
    expect(locationSection(tpl)).toBeUndefined();
  });
});
