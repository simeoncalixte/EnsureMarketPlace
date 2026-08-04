import {
  asMoneyString,
  buildExposureRows,
  coerceExposureAssetType,
  defaultExpiration,
  formatExposureRef,
  formatPolicyNumber,
  mapLineOfBusinessToPolicyType,
  nextPolicyVersionNumber,
} from './logic';

describe('policy logic — numbering & versioning', () => {
  it('formats a deterministic, zero-padded policy number', () => {
    expect(formatPolicyNumber(7)).toBe('POL-000007');
    expect(formatPolicyNumber(98765)).toBe('POL-098765');
  });

  it('versions the policy: issuance is 1, endorsements increment', () => {
    expect(nextPolicyVersionNumber(null)).toBe(1); // issuance
    expect(nextPolicyVersionNumber(1)).toBe(2); // first endorsement
    expect(nextPolicyVersionNumber(5)).toBe(6);
  });
});

describe('policy logic — default period', () => {
  it('defaults expiration to effective + 12 months without mutating the input', () => {
    const eff = new Date('2026-07-01T00:00:00.000Z');
    const exp = defaultExpiration(eff);
    expect(exp.toISOString()).toBe('2027-07-01T00:00:00.000Z');
    expect(eff.toISOString()).toBe('2026-07-01T00:00:00.000Z'); // unchanged
    expect(defaultExpiration(eff, 6).toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });

  it('formats money to 2dp', () => {
    expect(asMoneyString('1,000,000')).toBe('1000000.00');
    expect(asMoneyString(undefined)).toBeNull();
  });
});

describe('policy logic — LOB → policyType mapping', () => {
  it('maps recognizable lines to the policyType taxonomy, defaulting to commercial', () => {
    expect(mapLineOfBusinessToPolicyType('homeowners')).toBe('homeowners');
    expect(mapLineOfBusinessToPolicyType('personal_auto')).toBe('auto');
    expect(mapLineOfBusinessToPolicyType('commercial_fleet')).toBe('auto');
    expect(mapLineOfBusinessToPolicyType('ocean_marine_hull')).toBe('marine');
    expect(mapLineOfBusinessToPolicyType('group_life')).toBe('life');
    expect(mapLineOfBusinessToPolicyType('catastrophe_property')).toBe('commercial');
    expect(mapLineOfBusinessToPolicyType(null)).toBe('commercial');
  });
});

describe('policy logic — exposure (schedule of values) materialization', () => {
  it('builds one coerced ExposureUnit row per insured subject', () => {
    const rows = buildExposureRows('POL-000123', [
      { label: 'Warehouse #3', assetType: 'building', constructionType: 'steel', occupancyType: 'industrial', insuredValue: '6,000,000' },
      { label: 'Fleet truck 12', assetType: 'vehicle', constructionType: 'titanium', insuredValue: 80000 },
      { label: 'Misc item', assetType: 'other' }, // unknown asset → default building
    ]);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      exposureRef: 'POL-000123-EXP-0001',
      subjectIndex: 0,
      assetType: 'building',
      constructionType: 'steel',
      occupancyType: 'industrial',
      replacementCost: '6000000.00',
    });
    expect(rows[1]).toMatchObject({ assetType: 'vehicle', constructionType: null }); // titanium not in enum
    expect(rows[2].assetType).toBe('building'); // 'other' coerced to the default
  });

  it('returns [] for a single unitemized risk (no subjects)', () => {
    expect(buildExposureRows('POL-1', undefined)).toEqual([]);
    expect(buildExposureRows('POL-1', [])).toEqual([]);
    expect(coerceExposureAssetType('nonsense')).toBe('building');
    expect(formatExposureRef('POL-000007', 41)).toBe('POL-000007-EXP-0042');
  });
});
