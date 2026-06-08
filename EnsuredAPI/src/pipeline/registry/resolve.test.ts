import {
  RegistryRow,
  genericDefaultResolution,
  selectResolution,
} from './resolve';
import {
  selectModelStrategy,
  selectRatingStrategy,
  genericBurningCostModelStrategy,
  genericLossRatioRatingStrategy,
} from './strategy';
import { decideRegistryUpsert } from './upsert';
import { GENERIC_MODELING_METHOD, GENERIC_RATING_METHOD } from './types';

/**
 * DB-FREE unit tests for the Risk Class Registry resolver, strategy selection,
 * and upsert decision logic (Slice 2). None of these touch Postgres — they
 * exercise the pure `selectResolution`, `selectModelStrategy`,
 * `selectRatingStrategy`, and `decideRegistryUpsert` functions directly.
 */

const TENANT = 7;

function row(overrides: Partial<RegistryRow>): RegistryRow {
  return {
    organizationId: null,
    lineOfBusinessCode: 'property',
    lineOfBusinessSubTypeCode: '',
    activeSchemaVersionId: null,
    riskModelingMethod: 'cat_exposure',
    ratingMethod: 'technical_premium',
    appetiteDimensionsJson: { perils: ['hurricane'] },
    requiredDataFieldsJson: ['financials.tiv'],
    methodParamsJson: { exposureBase: 1000 },
    status: 'active',
    ...overrides,
  };
}

describe('selectResolution — specificity ladder', () => {
  const orgSubtype = row({
    organizationId: TENANT,
    lineOfBusinessCode: 'property',
    lineOfBusinessSubTypeCode: 'property_catastrophe',
    riskModelingMethod: 'org_subtype_method',
  });
  const orgPrimary = row({
    organizationId: TENANT,
    lineOfBusinessCode: 'property',
    lineOfBusinessSubTypeCode: '',
    riskModelingMethod: 'org_primary_method',
  });
  const platformSubtype = row({
    organizationId: null,
    lineOfBusinessCode: 'property',
    lineOfBusinessSubTypeCode: 'property_catastrophe',
    riskModelingMethod: 'platform_subtype_method',
  });
  const platformPrimary = row({
    organizationId: null,
    lineOfBusinessCode: 'property',
    lineOfBusinessSubTypeCode: '',
    riskModelingMethod: 'platform_primary_method',
  });

  it('rung 1: org + subtype wins over everything', () => {
    const res = selectResolution(
      [platformPrimary, platformSubtype, orgPrimary, orgSubtype],
      TENANT,
      'property',
      'property_catastrophe',
    );
    expect(res.resolvedFrom).toBe('org_subtype');
    expect(res.riskModelingMethod).toBe('org_subtype_method');
  });

  it('rung 2: org + primary when no org subtype row exists', () => {
    const res = selectResolution(
      [platformPrimary, platformSubtype, orgPrimary],
      TENANT,
      'property',
      'property_catastrophe',
    );
    expect(res.resolvedFrom).toBe('org_primary');
    expect(res.riskModelingMethod).toBe('org_primary_method');
  });

  it('rung 3: platform + subtype when org has no rows', () => {
    const res = selectResolution(
      [platformPrimary, platformSubtype],
      TENANT,
      'property',
      'property_catastrophe',
    );
    expect(res.resolvedFrom).toBe('platform_subtype');
    expect(res.riskModelingMethod).toBe('platform_subtype_method');
  });

  it('rung 4: platform + primary when no subtype rows match', () => {
    const res = selectResolution([platformPrimary], TENANT, 'property', 'property_catastrophe');
    expect(res.resolvedFrom).toBe('platform_primary');
    expect(res.riskModelingMethod).toBe('platform_primary_method');
  });

  it('rung 5: generic default when no row matches', () => {
    const res = selectResolution([], TENANT, 'property', 'property_catastrophe');
    expect(res.resolvedFrom).toBe('generic_default');
    expect(res.riskModelingMethod).toBe(GENERIC_MODELING_METHOD);
    expect(res.ratingMethod).toBe(GENERIC_RATING_METHOD);
    expect(res.appetiteDimensions).toEqual({});
    expect(res.requiredDataFields).toEqual([]);
    expect(res.methodParams).toEqual({});
    expect(res.schemaVersionId).toBeNull();
  });

  it('org rungs never match when tenantId is null (platform/generic only)', () => {
    const res = selectResolution([orgSubtype, orgPrimary], null, 'property', 'property_catastrophe');
    expect(res.resolvedFrom).toBe('generic_default');
  });

  it('falls back to generic default when only inactive rows match', () => {
    const inactive = row({
      organizationId: TENANT,
      lineOfBusinessCode: 'property',
      lineOfBusinessSubTypeCode: 'property_catastrophe',
      status: 'inactive',
    });
    const res = selectResolution([inactive], TENANT, 'property', 'property_catastrophe');
    expect(res.resolvedFrom).toBe('generic_default');
  });

  it('carries declaration fields through from the matched row', () => {
    const res = selectResolution([orgSubtype], TENANT, 'property', 'property_catastrophe');
    expect(res.appetiteDimensions).toEqual({ perils: ['hurricane'] });
    expect(res.requiredDataFields).toEqual(['financials.tiv']);
    expect(res.methodParams).toEqual({ exposureBase: 1000 });
  });

  it('fills empty method strings on a matched row with the generic methods', () => {
    const sparse = row({
      organizationId: TENANT,
      lineOfBusinessCode: 'property',
      lineOfBusinessSubTypeCode: '',
      riskModelingMethod: '',
      ratingMethod: null,
    });
    const res = selectResolution([sparse], TENANT, 'property');
    expect(res.resolvedFrom).toBe('org_primary');
    expect(res.riskModelingMethod).toBe(GENERIC_MODELING_METHOD);
    expect(res.ratingMethod).toBe(GENERIC_RATING_METHOD);
  });

  it('resolves primary-only request to org_primary (no subtype requested)', () => {
    const res = selectResolution([orgSubtype, orgPrimary], TENANT, 'property');
    expect(res.resolvedFrom).toBe('org_primary');
  });

  it('returns generic default for an empty/unknown primary code', () => {
    const res = selectResolution([orgPrimary], TENANT, '');
    expect(res.resolvedFrom).toBe('generic_default');
    expect(res.lineOfBusinessCode).toBe('');
  });
});

describe('genericDefaultResolution', () => {
  it('always produces non-empty methods + empty dimensions/fields', () => {
    const res = genericDefaultResolution('casualty', 'general_liability');
    expect(res).toEqual({
      lineOfBusinessCode: 'casualty',
      lineOfBusinessSubTypeCode: 'general_liability',
      schemaVersionId: null,
      riskModelingMethod: GENERIC_MODELING_METHOD,
      ratingMethod: GENERIC_RATING_METHOD,
      appetiteDimensions: {},
      requiredDataFields: [],
      methodParams: {},
      resolvedFrom: 'generic_default',
    });
  });
});

describe('selectModelStrategy / selectRatingStrategy — unknown/empty → generic', () => {
  it('returns the generic model strategy for an unknown method', () => {
    expect(selectModelStrategy('totally_unknown_method')).toBe(genericBurningCostModelStrategy);
  });

  it('returns the generic model strategy for empty/null/undefined', () => {
    expect(selectModelStrategy('')).toBe(genericBurningCostModelStrategy);
    expect(selectModelStrategy(null)).toBe(genericBurningCostModelStrategy);
    expect(selectModelStrategy(undefined)).toBe(genericBurningCostModelStrategy);
  });

  it('returns the registered generic model strategy by its own name', () => {
    expect(selectModelStrategy(GENERIC_MODELING_METHOD)).toBe(genericBurningCostModelStrategy);
  });

  it('returns the generic rating strategy for an unknown method', () => {
    expect(selectRatingStrategy('totally_unknown_method')).toBe(genericLossRatioRatingStrategy);
  });

  it('returns the generic rating strategy for empty/null/undefined', () => {
    expect(selectRatingStrategy('')).toBe(genericLossRatioRatingStrategy);
    expect(selectRatingStrategy(null)).toBe(genericLossRatioRatingStrategy);
    expect(selectRatingStrategy(undefined)).toBe(genericLossRatioRatingStrategy);
  });

  it('returns the registered generic rating strategy by its own name', () => {
    expect(selectRatingStrategy(GENERIC_RATING_METHOD)).toBe(genericLossRatioRatingStrategy);
  });
});

describe('generic strategy implementations', () => {
  it('generic burning-cost computes expected loss when params present', () => {
    const out = genericBurningCostModelStrategy.run({}, { exposureBase: 1_000_000, lossRate: 0.02 });
    expect(out.method).toBe(GENERIC_MODELING_METHOD);
    expect(out.expectedLossCost).toBe(20_000);
  });

  it('generic burning-cost returns null when params missing', () => {
    const out = genericBurningCostModelStrategy.run({}, {});
    expect(out.expectedLossCost).toBeNull();
  });

  it('generic loss-ratio derives premium from expected loss / target ratio', () => {
    const out = genericLossRatioRatingStrategy.price({}, { expectedLoss: 60_000, targetLossRatio: 0.6 });
    expect(out.method).toBe(GENERIC_RATING_METHOD);
    expect(out.technicalPremium).toBe(100_000);
  });

  it('generic loss-ratio returns null when target ratio is zero/missing', () => {
    expect(genericLossRatioRatingStrategy.price({}, { expectedLoss: 1, targetLossRatio: 0 }).technicalPremium).toBeNull();
    expect(genericLossRatioRatingStrategy.price({}, {}).technicalPremium).toBeNull();
  });
});

describe('decideRegistryUpsert', () => {
  const rows = [
    { id: 1, organizationId: 7, lineOfBusinessCode: 'property', lineOfBusinessSubTypeCode: '' },
    { id: 2, organizationId: 7, lineOfBusinessCode: 'property', lineOfBusinessSubTypeCode: 'property_catastrophe' },
    { id: 3, organizationId: null, lineOfBusinessCode: 'property', lineOfBusinessSubTypeCode: '' },
  ];

  it('updates the exact-scope match', () => {
    expect(decideRegistryUpsert(rows, 7, 'property', 'property_catastrophe')).toEqual({ action: 'update', updateId: 2 });
    expect(decideRegistryUpsert(rows, 7, 'property', '')).toEqual({ action: 'update', updateId: 1 });
    expect(decideRegistryUpsert(rows, null, 'property', '')).toEqual({ action: 'update', updateId: 3 });
  });

  it('creates when no exact-scope row exists (does not borrow a different scope)', () => {
    expect(decideRegistryUpsert(rows, 7, 'casualty', '')).toEqual({ action: 'create' });
    expect(decideRegistryUpsert(rows, 99, 'property', '')).toEqual({ action: 'create' });
    expect(decideRegistryUpsert([], 7, 'property', '')).toEqual({ action: 'create' });
  });
});
