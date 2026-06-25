import { definitionToAppetiteProfile } from './definitionToAppetiteProfile';

describe('definitionToAppetiteProfile', () => {
  it('projects the appetite block fields verbatim', () => {
    const profile = definitionToAppetiteProfile({
      id: 5,
      name: 'Primary',
      appetite: {
        preferredPerils: ['Wind', 'Flood'],
        excludedPerils: ['Cyber'],
        allowedLinesOfBusiness: ['property'],
        preferredJurisdictions: ['US/Florida'],
        excludedJurisdictions: ['US/California'],
        capacityByPeril: { Wind: 100, flood: '50', bad: 'x' },
        maxLineSize: 5000000,
        minCoverageLimit: 1000,
        maxCoverageLimit: 9000000,
        minTargetYield: 0.08,
        minDataQualityScore: 60,
        requiredFields: ['riskType', 'limit'],
      },
    });

    expect(profile.id).toBe(5);
    expect(profile.preferredPerils).toEqual(['Wind', 'Flood']);
    expect(profile.excludedPerils).toEqual(['Cyber']);
    expect(profile.allowedLinesOfBusiness).toEqual(['property']);
    expect(profile.preferredJurisdictions).toEqual(['US/Florida']);
    expect(profile.maxLineSize).toBe(5000000);
    expect(profile.minDataQualityScore).toBe(60);
    expect(profile.requiredFields).toEqual(['riskType', 'limit']);
    // capacityByPeril: lowercased keys, finite non-negative numbers only.
    expect(profile.capacityByPeril).toEqual({ wind: 100, flood: 50 });
  });

  it('is a no-op profile when the appetite block is empty', () => {
    const profile = definitionToAppetiteProfile({ id: 1, name: 'Empty', appetite: {} });
    expect(profile.preferredPerils).toBeNull();
    expect(profile.excludedPerils).toBeNull();
    expect(profile.allowedLinesOfBusiness).toBeNull();
    expect(profile.maxLineSize).toBeNull();
    expect(profile.minDataQualityScore).toBeNull();
    expect(profile.requiredFields).toBeNull();
    expect(profile.capacityByPeril).toEqual({});
  });

  it('falls back to the natural spec blocks when the appetite key is absent', () => {
    const profile = definitionToAppetiteProfile({
      id: 2,
      name: 'SpecDriven',
      appetite: {},
      riskEligibility: { eligibleRiskCategories: ['wind'], excludedRiskCategories: ['cyber'] },
      geographicControls: { allowedTerritories: ['US'], excludedTerritories: ['RU'] },
      exposureConstraints: { maxLineSize: 250000 },
      riskScoring: { minDataQualityScore: 70 },
      workflowConfig: { requiredFields: ['riskType'] },
    });

    expect(profile.preferredPerils).toEqual(['wind']);
    expect(profile.excludedPerils).toEqual(['cyber']);
    expect(profile.preferredJurisdictions).toEqual(['US']);
    expect(profile.excludedJurisdictions).toEqual(['RU']);
    expect(profile.maxLineSize).toBe(250000);
    expect(profile.minDataQualityScore).toBe(70);
    expect(profile.requiredFields).toEqual(['riskType']);
  });

  it('lets the appetite block win over the spec-block fallback', () => {
    const profile = definitionToAppetiteProfile({
      id: 3,
      name: 'Both',
      appetite: { preferredPerils: ['flood'] },
      riskEligibility: { eligibleRiskCategories: ['wind'] },
    });
    expect(profile.preferredPerils).toEqual(['flood']);
  });
});
