import Fastify, { FastifyInstance } from 'fastify';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { getSequelize } from '../../src/config/database';
import { ensureDefaultPageTemplates } from '../../src/db/pageTemplateDefaults';
import { initTestDb } from '../helpers/db';
import { Deal, Tranche } from '../../src/db/models';
import { Organization, User } from '../../src/db/models/identity.models';
import { marketplaceRoute } from '../../src/routes/marketplace';
import { reinsuranceSeedRoute } from '../../src/routes/reinsuranceSeed';

type Opportunity = {
  id: string;
  dealId: number;
  trancheId: number;
  fundingState: 'new' | 'partially_funded';
  dealName: string;
  dealStatus: string;
  trancheName: string;
  riskLevel: string;
  expectedReturnPct: number;
  maxLoss: number;
  durationMonths: number;
  capitalRequired: number;
  committedCapital: number;
  fundedAmount: number;
  pendingAmount: number;
  fundingProgressPct: number;
  startDate: string;
  endDate: string;
};

type TaxonomyTemplateField = {
  key: string;
  label: string;
  type: string;
};

type TaxonomyTemplateSection = {
  key: string;
  label: string;
  fields: TaxonomyTemplateField[];
};

type TaxonomyPageTemplate = {
  title?: string;
  sections?: TaxonomyTemplateSection[];
};

type TaxonomyResponseBody = {
  pageTemplate?: TaxonomyPageTemplate;
};

describe('GET /api/marketplace/opportunities/active-pending-funding', () => {
  (global as any).jest?.setTimeout?.(30000);
  let app: FastifyInstance;

  async function createOrganizationToken() {
    const organization = await Organization.create({
      name: 'Template Test Organization',
      type: 'insurer',
    });

    const user = await User.create({
      organizationId: organization.id,
      email: `template-tester-${Date.now()}@ensured.local`,
      passwordHash: 'hashed',
      role: 'insurer',
      firstName: 'Template',
      lastName: 'Tester',
    });

    const secret = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';
    const token = jwt.sign({ userId: user.id }, secret);

    return { organization, user, token };
  }

  beforeAll(async () => {
    await initTestDb();
    await ensureDefaultPageTemplates(getSequelize());
    app = Fastify({ logger: false });
    app.register(reinsuranceSeedRoute, { prefix: '/api' });
    app.register(marketplaceRoute, { prefix: '/api' });
    await app.ready();
  }, 30000);

  beforeEach(async () => {
    await initTestDb();
    await ensureDefaultPageTemplates(getSequelize());
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('returns the line of business taxonomy with primary and subtype entries', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/marketplace/line-of-business-taxonomy',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as {
      primaryTypes?: Array<{ code: string; label: string; subTypes: Array<{ code: string; label: string }> }>;
      pageTemplate?: {
        pageKey?: string;
        sections?: Array<{ fields: Array<{ key: string; options?: Array<{ label: string; value: string }> }> }>;
      };
    };
    expect(Array.isArray(body.primaryTypes)).toBe(true);
    expect(body.primaryTypes).toHaveLength(60);
    expect(body.primaryTypes?.every((primary) => Array.isArray(primary.subTypes) && primary.subTypes.length > 0)).toBe(true);

    const primaryLabels = new Set(body.primaryTypes?.map((primary) => primary.label));
    expect(primaryLabels.has('Property')).toBe(true);
    expect(primaryLabels.has('Cyber')).toBe(true);

    const totalSubTypes = body.primaryTypes?.reduce((count, primary) => count + primary.subTypes.length, 0) ?? 0;
    expect(totalSubTypes).toBe(240);

    expect(body.pageTemplate?.pageKey).toBe('insured-subjects');
    expect(Array.isArray(body.pageTemplate?.sections)).toBe(true);
    expect(body.pageTemplate?.sections?.length).toBeGreaterThan(0);

    const fieldDefinitions = body.pageTemplate?.sections?.flatMap((section) => section.fields) ?? [];
    expect(fieldDefinitions.some((field) => field.key === 'lineOfBusiness')).toBe(true);
    expect(fieldDefinitions.some((field) => Array.isArray(field.options) && field.options.length > 0)).toBe(true);
  });

  it('returns different page template variations for specific line of business queries', async () => {
    const residentialRes = await app.inject({
      method: 'GET',
      url: '/api/marketplace/line-of-business-taxonomy?lineOfBusinessCode=residential_property&lineOfBusinessSubTypeCode=residential_property_single_family',
    });

    expect(residentialRes.statusCode).toBe(200);
    const residentialBody = JSON.parse(residentialRes.payload) as {
      pageTemplate?: { title?: string; sections?: Array<{ fields: Array<{ key: string }> }> };
    };
    const residentialFieldKeys = residentialBody.pageTemplate?.sections?.flatMap((section) => section.fields.map((field) => field.key)) ?? [];

    expect(residentialBody.pageTemplate?.title).toBe('Residential Property: Single-Family');
    expect(residentialFieldKeys).toEqual(expect.arrayContaining([
      'yearBuilt',
      'squareFootage',
      'sprinklered',
      'protectionClass',
      'coverageLayerName',
      'coverageLayerType',
      'coverageLayerAttachmentPoint',
      'coverageLayerLimit',
      'coverageLayerDeductibleSir',
      'coverageLayerCoinsurancePct',
      'coverageLayerSublimits',
      'sovItemDescription',
      'sovInsuredValue',
      'sovQuantity',
      'sovValuationBasis',
      'sovCurrency',
      'sovNotes',
    ]));
    expect(residentialFieldKeys).not.toEqual(expect.arrayContaining(['aircraftModel', 'pilotExperienceHours']));

    const aviationRes = await app.inject({
      method: 'GET',
      url: '/api/marketplace/line-of-business-taxonomy?lineOfBusinessCode=aviation&lineOfBusinessSubTypeCode=aviation_aircraft_hull',
    });

    expect(aviationRes.statusCode).toBe(200);
    const aviationBody = JSON.parse(aviationRes.payload) as {
      pageTemplate?: { title?: string; sections?: Array<{ fields: Array<{ key: string }> }> };
    };
    const aviationFieldKeys = aviationBody.pageTemplate?.sections?.flatMap((section) => section.fields.map((field) => field.key)) ?? [];

    expect(aviationBody.pageTemplate?.title).toBe('Aviation: Aircraft Hull');
    expect(aviationFieldKeys).toEqual(expect.arrayContaining([
      'aircraftModel',
      'annualFlightHours',
      'hullValue',
      'pilotExperienceHours',
      'coverageLayerName',
      'coverageLayerType',
      'coverageLayerAttachmentPoint',
      'coverageLayerLimit',
      'coverageLayerDeductibleSir',
      'coverageLayerCoinsurancePct',
      'coverageLayerSublimits',
      'sovItemDescription',
      'sovInsuredValue',
      'sovQuantity',
      'sovValuationBasis',
      'sovCurrency',
      'sovNotes',
    ]));
    expect(aviationFieldKeys).not.toEqual(expect.arrayContaining(['yearBuilt', 'squareFootage', 'sprinklered']));
  });

  it('returns a residential single-family template whose fields make contextual sense', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/marketplace/line-of-business-taxonomy?lineOfBusinessCode=residential_property&lineOfBusinessSubTypeCode=residential_property_single_family',
    });

    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.payload) as TaxonomyResponseBody;
    const pageTemplate = body.pageTemplate;

    expect(pageTemplate?.title).toBe('Residential Property: Single-Family');

    const sections = pageTemplate?.sections ?? [];
    expect(sections.length).toBeGreaterThanOrEqual(6);

    const sectionLabels = sections.map((section) => section.label);
    expect(sectionLabels).toEqual(expect.arrayContaining([
      'Subject Identity',
      'Residential Property Location',
      'Single-Family Characteristics',
      'Single-Family Coverage',
      'Coverage Layer',
      'Statement of Values',
    ]));

    const fields = sections.flatMap((section) => section.fields);
    const fieldByKey = new Map(fields.map((field) => [field.key, field]));

    // Residential context should include property construction and protection details.
    expect(fieldByKey.get('yearBuilt')?.type).toBe('integer');
    expect(fieldByKey.get('squareFootage')?.type).toBe('integer');
    expect(fieldByKey.get('protectionClass')?.type).toBe('select');
    expect(fieldByKey.get('sprinklered')?.type).toBe('select');
    expect(fieldByKey.get('occupancyType')?.type).toBe('select');
    expect(fieldByKey.get('buildingCoverageIncluded')?.type).toBe('boolean');
    expect(fieldByKey.get('buildingCoverageLimit')?.type).toBe('number');
    expect(fieldByKey.get('contentsCoverageIncluded')?.type).toBe('boolean');
    expect(fieldByKey.get('contentsCoverageLimit')?.type).toBe('number');
    expect(fieldByKey.get('businessInterruptionCoverageIncluded')?.type).toBe('boolean');
    expect(fieldByKey.get('businessInterruptionCoverageLimit')?.type).toBe('number');
    expect(fieldByKey.get('businessInterruptionWaitingPeriodHours')?.type).toBe('integer');
    expect(fieldByKey.get('equipmentBreakdownCoverageIncluded')?.type).toBe('boolean');
    expect(fieldByKey.get('equipmentBreakdownCoverageLimit')?.type).toBe('number');
    expect(fieldByKey.get('deductibleSir')?.type).toBe('number');
    expect(fieldByKey.get('coinsurancePct')?.type).toBe('number');
    expect(fieldByKey.get('sublimits')?.type).toBe('textarea');
    expect(fieldByKey.get('coverageLayerName')?.type).toBe('text');
    expect(fieldByKey.get('coverageLayerType')?.type).toBe('select');
    expect(fieldByKey.get('coverageLayerAttachmentPoint')?.type).toBe('number');
    expect(fieldByKey.get('coverageLayerLimit')?.type).toBe('number');
    expect(fieldByKey.get('coverageLayerDeductibleSir')?.type).toBe('number');
    expect(fieldByKey.get('coverageLayerCoinsurancePct')?.type).toBe('number');
    expect(fieldByKey.get('coverageLayerSublimits')?.type).toBe('textarea');
    expect(fieldByKey.get('sovItemDescription')?.type).toBe('text');
    expect(fieldByKey.get('sovInsuredValue')?.type).toBe('number');
    expect(fieldByKey.get('sovQuantity')?.type).toBe('integer');
    expect(fieldByKey.get('sovValuationBasis')?.type).toBe('select');
    expect(fieldByKey.get('sovCurrency')?.type).toBe('text');
    expect(fieldByKey.get('sovNotes')?.type).toBe('textarea');

    // Residential context should not include clearly aviation-specific underwriting fields.
    expect(fieldByKey.has('aircraftModel')).toBe(false);
    expect(fieldByKey.has('pilotExperienceHours')).toBe(false);
    expect(fieldByKey.has('hullValue')).toBe(false);
  });

  it('persists added and removed template fields for a selected line of business scope', async () => {
    const lineOfBusinessCode = 'residential_property';
    const lineOfBusinessSubTypeCode = 'residential_property_single_family';
    const fieldKey = 'roof_shape';

    const baselineRes = await app.inject({
      method: 'GET',
      url: `/api/marketplace/line-of-business-taxonomy?lineOfBusinessCode=${lineOfBusinessCode}&lineOfBusinessSubTypeCode=${lineOfBusinessSubTypeCode}`,
    });

    expect(baselineRes.statusCode).toBe(200);
    const baselineBody = JSON.parse(baselineRes.payload) as TaxonomyResponseBody;
    const sectionKey = baselineBody.pageTemplate?.sections?.find((section) => section.key === 'statement-of-values')?.key;

    expect(sectionKey).toBeTruthy();

    const addRes = await app.inject({
      method: 'POST',
      url: '/api/marketplace/insured-subjects/page-template/fields',
      payload: {
        lineOfBusinessCode,
        lineOfBusinessSubTypeCode,
        sectionKey: sectionKey!,
        field: {
          key: fieldKey,
          label: 'Roof Shape',
          type: 'text',
          required: false,
        },
      },
    });

    expect(addRes.statusCode).toBe(200);

    const afterAddRes = await app.inject({
      method: 'GET',
      url: `/api/marketplace/line-of-business-taxonomy?lineOfBusinessCode=${lineOfBusinessCode}&lineOfBusinessSubTypeCode=${lineOfBusinessSubTypeCode}`,
    });

    expect(afterAddRes.statusCode).toBe(200);
    const afterAddBody = JSON.parse(afterAddRes.payload) as TaxonomyResponseBody;
    const addedField =
      afterAddBody.pageTemplate?.sections
        ?.find((section) => section.key === sectionKey)
        ?.fields.find((field) => field.key === fieldKey) ?? null;

    expect(addedField).toBeTruthy();
    expect(addedField?.label).toBe('Roof Shape');

    const removeRes = await app.inject({
      method: 'DELETE',
      url: '/api/marketplace/insured-subjects/page-template/fields',
      payload: {
        lineOfBusinessCode,
        lineOfBusinessSubTypeCode,
        sectionKey: sectionKey!,
        fieldKey,
      },
    });

    expect(removeRes.statusCode).toBe(200);

    const afterRemoveRes = await app.inject({
      method: 'GET',
      url: `/api/marketplace/line-of-business-taxonomy?lineOfBusinessCode=${lineOfBusinessCode}&lineOfBusinessSubTypeCode=${lineOfBusinessSubTypeCode}`,
    });

    expect(afterRemoveRes.statusCode).toBe(200);
    const afterRemoveBody = JSON.parse(afterRemoveRes.payload) as TaxonomyResponseBody;
    const removedFieldExists =
      afterRemoveBody.pageTemplate?.sections
        ?.find((section) => section.key === sectionKey)
        ?.fields.some((field) => field.key === fieldKey) ?? false;

    expect(removedFieldExists).toBe(false);
  });

  it('returns organization-scoped template field updates only when the same organization is resolved', async () => {
    const lineOfBusinessCode = 'residential_property';
    const lineOfBusinessSubTypeCode = 'residential_property_single_family';
    const fieldKey = 'foundation_type';
    const { organization, token } = await createOrganizationToken();

    const baselineRes = await app.inject({
      method: 'GET',
      url: `/api/marketplace/line-of-business-taxonomy?lineOfBusinessCode=${lineOfBusinessCode}&lineOfBusinessSubTypeCode=${lineOfBusinessSubTypeCode}`,
    });

    expect(baselineRes.statusCode).toBe(200);
    const baselineBody = JSON.parse(baselineRes.payload) as TaxonomyResponseBody;
    const sectionKey = baselineBody.pageTemplate?.sections?.[0]?.key;

    expect(sectionKey).toBeTruthy();
    expect(
      baselineBody.pageTemplate?.sections
        ?.flatMap((section) => section.fields)
        .some((field) => field.key === fieldKey) ?? false,
    ).toBe(false);

    const addRes = await app.inject({
      method: 'POST',
      url: '/api/marketplace/insured-subjects/page-template/fields',
      payload: {
        organizationId: organization.id,
        lineOfBusinessCode,
        lineOfBusinessSubTypeCode,
        sectionKey: sectionKey!,
        field: {
          key: fieldKey,
          label: 'Foundation Type',
          type: 'text',
        },
      },
    });

    expect(addRes.statusCode).toBe(200);

    const globalReadRes = await app.inject({
      method: 'GET',
      url: `/api/marketplace/line-of-business-taxonomy?lineOfBusinessCode=${lineOfBusinessCode}&lineOfBusinessSubTypeCode=${lineOfBusinessSubTypeCode}`,
    });

    expect(globalReadRes.statusCode).toBe(200);
    const globalReadBody = JSON.parse(globalReadRes.payload) as TaxonomyResponseBody;
    const globalFieldExists =
      globalReadBody.pageTemplate?.sections
        ?.flatMap((section) => section.fields)
        .some((field) => field.key === fieldKey) ?? false;

    expect(globalFieldExists).toBe(false);

    const queryScopedReadRes = await app.inject({
      method: 'GET',
      url: `/api/marketplace/line-of-business-taxonomy?organizationId=${organization.id}&lineOfBusinessCode=${lineOfBusinessCode}&lineOfBusinessSubTypeCode=${lineOfBusinessSubTypeCode}`,
    });

    expect(queryScopedReadRes.statusCode).toBe(200);
    const queryScopedReadBody = JSON.parse(queryScopedReadRes.payload) as TaxonomyResponseBody;
    const queryScopedField =
      queryScopedReadBody.pageTemplate?.sections
        ?.flatMap((section) => section.fields)
        .find((field) => field.key === fieldKey) ?? null;

    expect(queryScopedField?.label).toBe('Foundation Type');

    const authScopedReadRes = await app.inject({
      method: 'GET',
      url: `/api/marketplace/line-of-business-taxonomy?lineOfBusinessCode=${lineOfBusinessCode}&lineOfBusinessSubTypeCode=${lineOfBusinessSubTypeCode}`,
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(authScopedReadRes.statusCode).toBe(200);
    const authScopedReadBody = JSON.parse(authScopedReadRes.payload) as TaxonomyResponseBody;
    const authScopedField =
      authScopedReadBody.pageTemplate?.sections
        ?.flatMap((section) => section.fields)
        .find((field) => field.key === fieldKey) ?? null;

    expect(authScopedField?.label).toBe('Foundation Type');
  });

  it('persists organization-scoped grid layouts on insured-subject templates', async () => {
    const lineOfBusinessCode = 'residential_property';
    const lineOfBusinessSubTypeCode = 'residential_property_single_family';
    const { organization } = await createOrganizationToken();

    const baselineRes = await app.inject({
      method: 'GET',
      url: `/api/marketplace/line-of-business-taxonomy?organizationId=${organization.id}&lineOfBusinessCode=${lineOfBusinessCode}&lineOfBusinessSubTypeCode=${lineOfBusinessSubTypeCode}`,
    });

    expect(baselineRes.statusCode).toBe(200);
    const baselineBody = JSON.parse(baselineRes.payload) as {
      pageTemplate?: {
        sections?: Array<{
          key: string;
          layout?: { type?: string; columns?: number; gap?: number; dense?: boolean; columnWidths?: number[]; rowHeights?: number[] };
          fields: Array<{
            key: string;
            layout?: { columnStart?: number; columnSpan?: number; rowStart?: number; rowSpan?: number };
          }>;
        }>;
      };
    };

    expect(baselineBody.pageTemplate).toBeTruthy();

    const updatedTemplate = JSON.parse(JSON.stringify(baselineBody.pageTemplate));
    expect(Array.isArray(updatedTemplate.sections)).toBe(true);
    expect(updatedTemplate.sections.length).toBeGreaterThan(0);
    updatedTemplate.sections[0].layout = { type: 'grid', columns: 4, gap: 24, dense: true, columnWidths: [1, 1.5, 1, 1], rowHeights: [120, 120, 140] };
    updatedTemplate.sections[0].fields[0].layout = { columnStart: 2, columnSpan: 2, rowStart: 1, rowSpan: 1 };

    const saveRes = await app.inject({
      method: 'PUT',
      url: '/api/marketplace/insured-subjects/page-template',
      payload: {
        organizationId: organization.id,
        lineOfBusinessCode,
        lineOfBusinessSubTypeCode,
        definitionJson: updatedTemplate,
      },
    });

    expect(saveRes.statusCode).toBe(201);

    const queryScopedReadRes = await app.inject({
      method: 'GET',
      url: `/api/marketplace/line-of-business-taxonomy?organizationId=${organization.id}&lineOfBusinessCode=${lineOfBusinessCode}&lineOfBusinessSubTypeCode=${lineOfBusinessSubTypeCode}`,
    });

    expect(queryScopedReadRes.statusCode).toBe(200);
    const queryScopedReadBody = JSON.parse(queryScopedReadRes.payload) as {
      pageTemplate?: {
        sections?: Array<{
          layout?: { type?: string; columns?: number; gap?: number; dense?: boolean; columnWidths?: number[]; rowHeights?: number[] };
          fields: Array<{ layout?: { columnStart?: number; columnSpan?: number; rowStart?: number; rowSpan?: number } }>;
        }>;
      };
    };

    expect(queryScopedReadBody.pageTemplate?.sections?.[0]?.layout).toMatchObject({
      type: 'grid',
      columns: 4,
      gap: 24,
      dense: true,
      columnWidths: [1, 1.5, 1, 1],
      rowHeights: [120, 120, 140],
    });
    expect(queryScopedReadBody.pageTemplate?.sections?.[0]?.fields?.[0]?.layout).toMatchObject({ columnStart: 2, columnSpan: 2, rowStart: 1, rowSpan: 1 });

    const globalReadRes = await app.inject({
      method: 'GET',
      url: `/api/marketplace/line-of-business-taxonomy?lineOfBusinessCode=${lineOfBusinessCode}&lineOfBusinessSubTypeCode=${lineOfBusinessSubTypeCode}`,
    });

    expect(globalReadRes.statusCode).toBe(200);
    const globalReadBody = JSON.parse(globalReadRes.payload) as {
      pageTemplate?: { sections?: Array<{ layout?: { columns?: number } }> };
    };

    expect(globalReadBody.pageTemplate?.sections?.[0]?.layout?.columns).not.toBe(4);

    const createDealRes = await app.inject({
      method: 'POST',
      url: '/api/marketplace/deals',
      payload: {
        organizationId: organization.id,
        name: 'Layout Snapshot Test',
        coverageLimit: 1000000,
        attachmentPoint: 250000,
        exhaustionPoint: 1500000,
        premium: 75000,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        subjects: [
          {
            subjectLabel: 'Warehouse 1',
            subjectIndex: 1,
            lineOfBusiness: 'Residential Property',
            lineOfBusinessSubType: 'Single-Family',
            fieldValues: {
              locationText: 'Houston, TX',
              assetType: 'building',
              constructionType: 'masonry',
              occupancyType: 'residential',
              replacementCost: 500000,
              latitude: 29.7604,
              longitude: -95.3698,
              vulnerabilityScore: 0.42,
            },
          },
        ],
      },
    });

    expect(createDealRes.statusCode).toBe(201);

    const createdDeal = await Deal.findOne({ order: [['id', 'DESC']] });
    expect(createdDeal).toBeTruthy();
    expect(Array.isArray(createdDeal?.subjectsJson)).toBe(true);
    expect(createdDeal?.subjectsJson).toHaveLength(1);

    const snapshotSubject = createdDeal?.subjectsJson?.[0] as any;
    expect(snapshotSubject).toMatchObject({
      subjectLabel: 'Warehouse 1',
      lineOfBusiness: 'Residential Property',
      lineOfBusinessSubType: 'Single-Family',
      fieldValues: {
        locationText: 'Houston, TX',
        assetType: 'building',
        constructionType: 'masonry',
        occupancyType: 'residential',
      },
    });

    expect(snapshotSubject?.templateSnapshot).toMatchObject({
      scopeKey: `organization:${organization.id}`,
      organizationId: organization.id,
      lineOfBusinessCode: lineOfBusinessCode,
      lineOfBusinessSubTypeCode: lineOfBusinessSubTypeCode,
    });
    expect(snapshotSubject?.templateSnapshot?.sections?.[0]?.layout).toMatchObject({
      type: 'grid',
      columns: 4,
      gap: 24,
      dense: true,
      columnWidths: [1, 1.5, 1, 1],
      rowHeights: [120, 120, 140],
    });
    expect(snapshotSubject?.templateSnapshot?.sections?.[0]?.fields?.[0]).toMatchObject({
      key: 'subjectLabel',
      value: 'Warehouse 1',
      layout: { columnStart: 2, columnSpan: 2, rowStart: 1, rowSpan: 1 },
    });

    const locationField = snapshotSubject?.templateSnapshot?.sections?.flatMap((section: any) => section.fields).find((field: any) => field.key === 'locationText');
    expect(locationField?.value).toBe('Houston, TX');
  });

  it('returns active opportunities that are new and partially funded', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/seed/reinsurance',
      payload: {
        investorCount: 4,
        tranchesPerDeal: 3,
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/marketplace/opportunities/active-pending-funding',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as Opportunity[];

    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);

    for (const item of body) {
      expect(item.pendingAmount).toBeGreaterThan(0);
      expect(item.capitalRequired).toBeGreaterThan(item.fundedAmount);
      expect(item.committedCapital).toBe(item.fundedAmount);
      expect(['approved', 'fundraising', 'active']).toContain(item.dealStatus);
      expect(item.fundingProgressPct).toBeGreaterThanOrEqual(0);
      expect(item.fundingProgressPct).toBeLessThan(100);
    }

    const states = new Set(body.map((item) => item.fundingState));
    expect(states.has('new')).toBe(true);
    expect(states.has('partially_funded')).toBe(true);

    const hasZeroFunded = body.some((item) => item.fundedAmount === 0 && item.fundingState === 'new');
    const hasPartialFunded = body.some((item) => item.fundedAmount > 0 && item.fundingState === 'partially_funded');

    expect(hasZeroFunded).toBe(true);
    expect(hasPartialFunded).toBe(true);

    // write available deals to a fixtures JSON file for downstream use
    try {
      const fixturesDir = path.resolve(__dirname, '../fixtures');
      fs.mkdirSync(fixturesDir, { recursive: true });
      const deals = Array.from(new Set(body.map((it) => it.dealId))).map((id) => ({ dealId: id, dealName: body.find((b) => b.dealId === id)?.dealName ?? '' }));
      fs.writeFileSync(path.join(fixturesDir, 'deals.json'), JSON.stringify(deals, null, 2), 'utf8');
    } catch (err) {
      // do not fail the test if writing fixtures fails, but log for debugging
      // eslint-disable-next-line no-console
      console.warn('Failed to write deals fixture:', err);
    }
  });

  it('can filter opportunities by dealId', async () => {
    const seedRes = await app.inject({
      method: 'POST',
      url: '/api/seed/reinsurance',
      payload: { investorCount: 4, tranchesPerDeal: 3 },
    });
    expect(seedRes.statusCode).toBe(201);
    const summary = JSON.parse(seedRes.payload) as any;
    const dealId = summary?.ids?.dealId;
    expect(typeof dealId).toBe('number');

    const res = await app.inject({
      method: 'GET',
      url: `/api/marketplace/opportunities/active-pending-funding?dealId=${dealId}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as Opportunity[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.every((it) => it.dealId === dealId)).toBe(true);
  });

  it('persists subject line of business and text location on deal creation', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/marketplace/deals',
      payload: {
        name: 'Subject LOB Location Test',
        coverageLimit: 1000000,
        attachmentPoint: 250000,
        exhaustionPoint: 1500000,
        premium: 75000,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        subjects: [
          {
            subjectLabel: 'Warehouse 1',
            subjectIndex: 1,
            lineOfBusiness: 'Property',
            lineOfBusinessSubType: 'Catastrophe',
            locationText: 'Houston, TX',
            assetType: 'building',
            constructionType: 'masonry',
            occupancyType: 'commercial',
            replacementCost: 500000,
            latitude: 29.7604,
            longitude: -95.3698,
            vulnerabilityScore: 0.42,
          },
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    const createdDeal = await Deal.findOne({ order: [['id', 'DESC']] });
    expect(createdDeal).not.toBeNull();
    expect(Array.isArray(createdDeal?.subjectsJson)).toBe(true);
    expect(createdDeal?.subjectsJson).toHaveLength(1);
    expect(createdDeal?.subjectsJson?.[0]).toMatchObject({
      subjectLabel: 'Warehouse 1',
      lineOfBusiness: 'Property',
      lineOfBusinessSubType: 'Catastrophe',
      locationText: 'Houston, TX',
    });
  });

  it('persists selective tranche subject assignments on deal creation', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/marketplace/deals',
      payload: {
        name: 'Selective Tranche Subject Test',
        coverageLimit: 2500000,
        attachmentPoint: 500000,
        exhaustionPoint: 3500000,
        premium: 125000,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        subjects: [
          {
            subjectId: 'subject-warehouse',
            subjectLabel: 'Warehouse',
            subjectIndex: 1,
            lineOfBusiness: 'Property',
            lineOfBusinessSubType: 'All Risk',
            locationText: 'Dallas, TX',
            assetType: 'building',
            constructionType: 'masonry',
            occupancyType: 'commercial',
            replacementCost: 750000,
            latitude: 32.7767,
            longitude: -96.797,
            vulnerabilityScore: 0.55,
          },
          {
            subjectId: 'subject-plant',
            subjectLabel: 'Plant',
            subjectIndex: 2,
            lineOfBusiness: 'Property',
            lineOfBusinessSubType: 'Catastrophe',
            locationText: 'Austin, TX',
            assetType: 'building',
            constructionType: 'steel',
            occupancyType: 'industrial',
            replacementCost: 1250000,
            latitude: 30.2672,
            longitude: -97.7431,
            vulnerabilityScore: 0.61,
          },
        ],
        tranches: [
          {
            name: 'Senior Capital',
            layerMin: 1000000,
            layerMax: 3500000,
            returnRate: 0,
            riskLevel: 'low',
            capitalRequired: 2000000,
            subjectSelectionJson: {
              mode: 'selective',
              subjectIds: ['subject-plant'],
            },
          },
        ],
      },
    });

    expect(res.statusCode).toBe(201);

    const createdTranche = await Tranche.findOne({ order: [['id', 'DESC']] });
    expect(createdTranche).not.toBeNull();
    expect(createdTranche?.subjectSelectionJson).toMatchObject({
      mode: 'selective',
      subjectIds: ['subject-plant'],
    });
  });
});
