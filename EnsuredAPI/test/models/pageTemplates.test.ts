import { getSequelize } from '../../src/config/database';
import { PageTemplate } from '../../src/db/models';
import { ensureDefaultPageTemplates } from '../../src/db/pageTemplateDefaults';
import { initTestDb } from '../helpers/db';

describe('PageTemplate model defaults', () => {
  (global as any).jest?.setTimeout?.(30000);

  beforeAll(async () => {
    await initTestDb();
    await ensureDefaultPageTemplates(getSequelize());
  }, 30000);

  it('seeds a default insured-subject page template at version 1', async () => {
    const templates = await PageTemplate.findAll({
      where: {
        pageKey: 'insured-subjects',
        scopeKey: 'global',
        lineOfBusinessCode: '',
        lineOfBusinessSubTypeCode: '',
      },
      order: [['version', 'ASC']],
    });

    expect(templates).toHaveLength(1);

    const template = templates[0];
    expect(template.version).toBe(1);
    expect(template.isDefault).toBe(true);
    expect(template.status).toBe('published');
    expect(template.definitionJson).toMatchObject({
      schemaVersion: 1,
      pageKey: 'insured-subjects',
      sections: expect.any(Array),
    });

    const sectionKeys = template.definitionJson.sections.map((section) => section.key);
    expect(sectionKeys).toEqual(['subject-identity', 'subject-location', 'subject-exposure', 'subject-coverage', 'statement-of-values', 'loss-history']);
    expect(
      template.definitionJson.sections.every(
        (section) =>
          section.layout?.type === 'grid' &&
          typeof section.layout?.columns === 'number' &&
          Array.isArray(section.layout?.columnWidths) &&
          Array.isArray(section.layout?.rowHeights),
      ),
    ).toBe(true);

    const fieldKeys = template.definitionJson.sections.flatMap((section) => section.fields.map((field) => field.key));
    expect(fieldKeys).toEqual(
      expect.arrayContaining([
        'subjectLabel',
        'subjectReference',
        'lineOfBusiness',
        'lineOfBusinessSubType',
        'riskDescription',
        'locationText',
        'countryCode',
        'latitude',
        'longitude',
        'exposureBasis',
        'exposureAmount',
        'exposureUnitCount',
        'riskQualityScore',
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
        'lossHistoryYears',
        'claimCount',
        'totalIncurredLosses',
        'largestLoss',
        'lossNotes',
      ]),
    );
  });

  it('does not duplicate the default insured-subject page template when seeded again', async () => {
    await ensureDefaultPageTemplates(getSequelize());

    const templates = await PageTemplate.findAll({
      where: {
        pageKey: 'insured-subjects',
        scopeKey: 'global',
        lineOfBusinessCode: '',
        lineOfBusinessSubTypeCode: '',
      },
    });

    expect(templates).toHaveLength(1);
  });

  it('refreshes an existing seeded template when the stored default definition is stale', async () => {
    const template = await PageTemplate.findOne({
      where: {
        pageKey: 'insured-subjects',
        scopeKey: 'global',
        lineOfBusinessCode: 'residential_property',
        lineOfBusinessSubTypeCode: 'residential_property_single_family',
      },
    });

    expect(template).toBeTruthy();

    await template!.update({
      definitionJson: {
        schemaVersion: 1,
        pageKey: 'insured-subjects',
        title: 'Stale Template',
        description: 'Outdated template payload',
        sections: [],
      },
    });

    await ensureDefaultPageTemplates(getSequelize());

    const refreshed = await PageTemplate.findOne({
      where: {
        pageKey: 'insured-subjects',
        scopeKey: 'global',
        lineOfBusinessCode: 'residential_property',
        lineOfBusinessSubTypeCode: 'residential_property_single_family',
      },
    });

    expect(refreshed?.definitionJson.title).toBe('Residential Property: Single-Family');

    const fieldKeys = refreshed?.definitionJson.sections.flatMap((section) => section.fields.map((field) => field.key)) ?? [];
    expect(fieldKeys).toEqual(expect.arrayContaining([
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
  });

  it('seeds line-of-business-specific insured-subject template variations', async () => {
    const templates = await PageTemplate.findAll({
      where: {
        pageKey: 'insured-subjects',
        scopeKey: 'global',
      },
    });

    expect(templates.length).toBeGreaterThan(1);

    const residentialSingleFamily = templates.find(
      (template) =>
        template.lineOfBusinessCode === 'residential_property' &&
        template.lineOfBusinessSubTypeCode === 'residential_property_single_family',
    );
    expect(residentialSingleFamily).toBeDefined();

    const aviationHull = templates.find(
      (template) => template.lineOfBusinessCode === 'aviation' && template.lineOfBusinessSubTypeCode === 'aviation_aircraft_hull',
    );
    expect(aviationHull).toBeDefined();

    const residentialFieldKeys = residentialSingleFamily?.definitionJson.sections.flatMap((section) => section.fields.map((field) => field.key)) ?? [];
    const aviationFieldKeys = aviationHull?.definitionJson.sections.flatMap((section) => section.fields.map((field) => field.key)) ?? [];

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
    expect(aviationFieldKeys).toEqual(expect.arrayContaining(['aircraftModel', 'annualFlightHours', 'hullValue', 'pilotExperienceHours']));
    expect(residentialFieldKeys).not.toEqual(aviationFieldKeys);
  });
});