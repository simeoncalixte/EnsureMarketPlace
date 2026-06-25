import {
  extractProfileTaxonomyCodes,
  resolveTaxonomyAppetiteInput,
} from './taxonomyResolve';
import { RiskClassResolution } from '../registry/types';

/** A stub resolver returning the given appetite dimensions; never touches the DB. */
const stubResolver = (dimensions: Record<string, unknown>) =>
  async (
    _tenantId: number | null,
    primary: string | null,
    subType?: string | null,
  ): Promise<RiskClassResolution> => ({
    lineOfBusinessCode: primary ?? '',
    lineOfBusinessSubTypeCode: subType ?? '',
    schemaVersionId: null,
    riskModelingMethod: 'generic_burning_cost',
    ratingMethod: 'generic_loss_ratio',
    appetiteDimensions: dimensions,
    requiredDataFields: [],
    methodParams: {},
    resolvedFrom: 'generic_default',
  });

describe('extractProfileTaxonomyCodes', () => {
  test('keeps taxonomy-code entries and drops free-text entries', () => {
    const codes = extractProfileTaxonomyCodes([
      'property', // taxonomy primary code
      'Commercial Property', // taxonomy label → code
      'some-bespoke-program', // free text → dropped
      'marine', // not a known primary code/label → dropped
    ]);
    expect(codes).toContain('property');
    expect(codes).toContain('commercial_property');
    expect(codes).not.toContain('some-bespoke-program');
    expect(codes).not.toContain('marine');
  });

  test('non-array input yields empty', () => {
    expect(extractProfileTaxonomyCodes(null)).toEqual([]);
    expect(extractProfileTaxonomyCodes(undefined)).toEqual([]);
  });
});

describe('resolveTaxonomyAppetiteInput', () => {
  test('returns null when no taxonomy code resolves (free-text fallback)', async () => {
    const out = await resolveTaxonomyAppetiteInput({
      organizationId: 1,
      lineOfBusiness: 'totally-unknown-line',
      allowedLinesOfBusiness: ['property'],
      resolver: stubResolver({}),
    });
    expect(out).toBeNull();
  });

  test('returns null when no taxonomy-aware data exists (free-text fallback)', async () => {
    const out = await resolveTaxonomyAppetiteInput({
      organizationId: 1,
      lineOfBusiness: 'property', // resolves to a code...
      allowedLinesOfBusiness: ['some bespoke program'], // ...but no taxonomy codes anywhere
      resolver: stubResolver({}),
    });
    expect(out).toBeNull();
  });

  test('builds an input from registry dimensions', async () => {
    const out = await resolveTaxonomyAppetiteInput({
      organizationId: 1,
      lineOfBusiness: 'residential property',
      allowedLinesOfBusiness: [],
      resolver: stubResolver({ excludedLineOfBusinessCodes: ['residential_property'] }),
    });
    expect(out).not.toBeNull();
    expect(out!.resolved.primaryCode).toBe('residential_property');
    expect(out!.declaration.excludedLineOfBusinessCodes).toEqual(['residential_property']);
  });

  test('builds an input from profile taxonomy codes (no registry data)', async () => {
    const out = await resolveTaxonomyAppetiteInput({
      organizationId: 1,
      lineOfBusiness: 'property',
      allowedLinesOfBusiness: ['Commercial Property'],
      resolver: stubResolver({}),
    });
    expect(out).not.toBeNull();
    expect(out!.declaration.allowedLineOfBusinessCodes).toContain('commercial_property');
  });

  test('fail-safe: a throwing resolver degrades to null', async () => {
    const throwing = async (): Promise<RiskClassResolution> => {
      throw new Error('db down');
    };
    const out = await resolveTaxonomyAppetiteInput({
      organizationId: 1,
      lineOfBusiness: 'property',
      allowedLinesOfBusiness: ['property'],
      resolver: throwing,
    });
    expect(out).toBeNull();
  });
});
