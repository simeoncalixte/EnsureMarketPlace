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
import { Organization, CapacityDefinition } from '../../src/db/models';
import { RiskClassRegistry } from '../../src/db/models/riskClassRegistry.models';
import { initTestDb } from '../helpers/db';
import { evaluateAppetite } from '../../src/pipeline/validation/appetiteEngine';
import { definitionToAppetiteProfile } from '../../src/pipeline/validation/definitionToAppetiteProfile';
import { resolveTaxonomyAppetiteInput } from '../../src/pipeline/validation/taxonomyResolve';

/** Load the org's active capacity definition projected into an appetite profile. */
async function loadProfile(organizationId: number) {
  const def = await CapacityDefinition.findOne({ where: { organizationId, isActive: true } });
  return def ? definitionToAppetiteProfile(def) : null;
}

describe('Slice 4 — taxonomy-aware appetite (real DB integration)', () => {
  (global as any).jest?.setTimeout?.(60000);

  let orgId: number;

  beforeAll(async () => {
    await initTestDb();
    const org = await Organization.create({ name: 'Slice4 Insurer', type: 'insurer' } as any);
    orgId = org.id;

    // Active capacity definition whose appetite allow-list would PASS "property".
    await CapacityDefinition.create({
      organizationId: orgId,
      name: 'Migrated Appetite',
      status: 'active',
      isActive: true,
      appetite: { allowedLinesOfBusiness: ['property'] },
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
    const profile = await loadProfile(orgId);
    expect(profile).toBeTruthy();

    const taxonomy = await resolveTaxonomyAppetiteInput({
      organizationId: orgId,
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
    const profile = await loadProfile(orgId);

    // "marine" resolves to no taxonomy code AND there is no registry row for it,
    // so the resolver returns null ⇒ the engine uses the free-text matcher, which
    // flags "marine" because it is not in allowedLinesOfBusiness (['property']).
    const taxonomy = await resolveTaxonomyAppetiteInput({
      organizationId: orgId,
      lineOfBusiness: 'some bespoke marine program',
      allowedLinesOfBusiness: profile!.allowedLinesOfBusiness ?? null,
    });
    expect(taxonomy).toBeNull();

    const result = evaluateAppetite({ lineOfBusiness: 'marine' }, profile, [], taxonomy);
    expect(result.decision).toBe('FLAGGED');
    expect(result.findings.some((f) => f.rule === 'allowed_line_of_business')).toBe(true);
  });
});
