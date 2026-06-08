/**
 * Slice 4 — taxonomy-aware appetite, REAL-DATABASE integration test.
 *
 * Exercises the wired augmentation end-to-end against Postgres: a real
 * Organization + OrganizationAppetiteProfile (+ an optional RiskClassRegistry row)
 * drives `resolveTaxonomyAppetiteInput` → `evaluateAppetite`, proving:
 *   1. a registry-declared excluded taxonomy primary takes a submission whose
 *      free-text LOB would otherwise pass OUT of appetite (taxonomy override), and
 *   2. with NO taxonomy data, the engine falls back to the unchanged free-text
 *      LOB match (non-degradation).
 *
 * Requires Postgres on 127.0.0.1:5432 (see test/helpers/db.ts + globalSetup).
 *
 * NOTE: the maintainer must run this separately — the agent's Bash sandbox blocks
 * the Postgres connection on 5432, so this suite was authored but NOT executed here.
 */
import { getSequelize } from '../../src/config/database';
import { Organization, OrganizationAppetiteProfile } from '../../src/db/models';
import { RiskClassRegistry } from '../../src/db/models/riskClassRegistry.models';
import { initTestDb } from '../helpers/db';
import { evaluateAppetite } from '../../src/pipeline/validation/appetiteEngine';
import { resolveTaxonomyAppetiteInput } from '../../src/pipeline/validation/taxonomyResolve';

describe('Slice 4 — taxonomy-aware appetite (real DB integration)', () => {
  (global as any).jest?.setTimeout?.(60000);

  let orgId: number;

  beforeAll(async () => {
    await initTestDb();
    const org = await Organization.create({ name: 'Slice4 Insurer', type: 'insurer' } as any);
    orgId = org.id;

    // Profile whose free-text allow-list would PASS "property".
    await OrganizationAppetiteProfile.create({
      organizationId: orgId,
      name: 'Default Appetite',
      status: 'active',
      isDefault: true,
      allowedLinesOfBusiness: ['property'],
    } as any);

    // Registry row declaring a taxonomy-aware EXCLUSION of residential_property.
    await RiskClassRegistry.create({
      organizationId: orgId,
      lineOfBusinessCode: 'residential_property',
      lineOfBusinessSubTypeCode: '',
      status: 'active',
      appetiteDimensionsJson: { excludedLineOfBusinessCodes: ['residential_property'] },
      requiredDataFieldsJson: [],
      methodParamsJson: {},
    } as any);
  }, 60000);

  afterAll(async () => {
    await getSequelize().close();
  });

  it('taxonomy-declared exclusion overrides a free-text-allowed LOB', async () => {
    const profile = await OrganizationAppetiteProfile.findOne({ where: { organizationId: orgId } });
    expect(profile).toBeTruthy();

    const taxonomy = await resolveTaxonomyAppetiteInput({
      tenantId: orgId,
      // Free text resolves to residential_property / single_family.
      lineOfBusiness: 'residential property single family',
      allowedLinesOfBusiness: profile!.allowedLinesOfBusiness ?? null,
    });
    expect(taxonomy).not.toBeNull();
    expect(taxonomy!.declaration.excludedLineOfBusinessCodes).toContain('residential_property');

    const result = evaluateAppetite(
      { lineOfBusiness: 'property' }, // free text alone would PASS the allow-list
      profile,
      [],
      taxonomy,
    );
    expect(result.decision).toBe('OUT_OF_APPETITE');
    expect(result.findings.some((f) => f.rule === 'taxonomy_excluded_line_of_business')).toBe(true);
    expect(result.reasons.some((r) => /excluded by appetite/i.test(r))).toBe(true);
  });

  it('non-degradation: no taxonomy data ⇒ free-text LOB match unchanged', async () => {
    const profile = await OrganizationAppetiteProfile.findOne({ where: { organizationId: orgId } });

    // "marine" resolves to no taxonomy code AND there is no registry row for it,
    // so the resolver returns null ⇒ the engine uses the free-text matcher, which
    // flags "marine" because it is not in allowedLinesOfBusiness (['property']).
    const taxonomy = await resolveTaxonomyAppetiteInput({
      tenantId: orgId,
      lineOfBusiness: 'some bespoke marine program',
      allowedLinesOfBusiness: profile!.allowedLinesOfBusiness ?? null,
    });
    expect(taxonomy).toBeNull();

    const result = evaluateAppetite({ lineOfBusiness: 'marine' }, profile, [], taxonomy);
    expect(result.decision).toBe('FLAGGED');
    expect(result.findings.some((f) => f.rule === 'allowed_line_of_business')).toBe(true);
  });
});
