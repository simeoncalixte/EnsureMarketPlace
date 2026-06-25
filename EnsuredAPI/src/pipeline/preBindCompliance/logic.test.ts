import {
  gatherScreeningParties,
  resolveJurisdiction,
  resolveLicensing,
  rollupClearance,
  worstSanctionsResult,
  type LicenseAuthorityRow,
} from './logic';

describe('preBindCompliance logic', () => {
  describe('gatherScreeningParties', () => {
    it('always screens the cedent and de-duplicates names case-insensitively', () => {
      const parties = gatherScreeningParties({
        cedentName: 'Northwind Specialty',
        canonicalData: { namedInsured: 'northwind specialty', additionalInsureds: ['Acme Co'] },
      });
      expect(parties.map((p) => p.role)).toEqual(['cedent', 'additional_insured']);
      expect(parties.map((p) => p.name)).toEqual(['Northwind Specialty', 'Acme Co']);
    });

    it('returns an empty list when no party names are present', () => {
      expect(gatherScreeningParties({ cedentName: null, canonicalData: null })).toEqual([]);
    });
  });

  describe('resolveJurisdiction', () => {
    it('prefers an explicit ISO country code', () => {
      expect(resolveJurisdiction({ canonicalData: { countryCode: 'gb', stateCode: 'ldn' }, portfolioRegion: null }))
        .toEqual({ countryCode: 'GB', stateCode: 'LDN' });
    });

    it('recognizes a country name from the portfolio region', () => {
      expect(resolveJurisdiction({ canonicalData: null, portfolioRegion: 'North America / USA' }).countryCode).toBe('US');
    });

    it('defaults to US when nothing resolves', () => {
      expect(resolveJurisdiction({ canonicalData: null, portfolioRegion: 'Gulf Coast' }).countryCode).toBe('US');
    });
  });

  describe('resolveLicensing', () => {
    const authorities: LicenseAuthorityRow[] = [
      { countryCode: 'US', stateCode: null, lineOfBusinessCode: null, carrierOrganizationId: null, admitted: true, surplusLinesEligible: true },
      { countryCode: 'US', stateCode: 'FL', lineOfBusinessCode: null, carrierOrganizationId: null, admitted: false, surplusLinesEligible: true },
      { countryCode: 'US', stateCode: 'NY', lineOfBusinessCode: null, carrierOrganizationId: null, admitted: false, surplusLinesEligible: false },
    ];

    it('resolves the national admitted default', () => {
      expect(resolveLicensing(authorities, { countryCode: 'US', stateCode: null, lineOfBusinessCode: null, carrierOrganizationId: null }).status)
        .toBe('admitted');
    });

    it('prefers the more specific state row (surplus-lines path)', () => {
      expect(resolveLicensing(authorities, { countryCode: 'US', stateCode: 'FL', lineOfBusinessCode: null, carrierOrganizationId: null }).status)
        .toBe('surplus_lines');
    });

    it('flags a state with no admitted/surplus eligibility as not authorized', () => {
      expect(resolveLicensing(authorities, { countryCode: 'US', stateCode: 'NY', lineOfBusinessCode: null, carrierOrganizationId: null }).status)
        .toBe('not_authorized');
    });

    it('returns review when no authority is on file for the jurisdiction', () => {
      expect(resolveLicensing(authorities, { countryCode: 'JP', stateCode: null, lineOfBusinessCode: null, carrierOrganizationId: null }).status)
        .toBe('review');
    });
  });

  describe('worstSanctionsResult', () => {
    it('hit dominates everything', () => {
      expect(worstSanctionsResult(['clear', 'potential_match', 'hit'])).toBe('hit');
    });
    it('potential_match over clear', () => {
      expect(worstSanctionsResult(['clear', 'potential_match'])).toBe('potential_match');
    });
    it('skipped when nothing screened', () => {
      expect(worstSanctionsResult([])).toBe('skipped');
    });
  });

  describe('rollupClearance', () => {
    const ctx = { partyCount: 1, jurisdictionLabel: 'US' };

    it('passes when sanctions clear and carrier admitted', () => {
      expect(rollupClearance({ sanctionsStatus: 'clear', licensingStatus: 'admitted', ...ctx }).status).toBe('passed');
    });

    it('passes via the surplus-lines path', () => {
      expect(rollupClearance({ sanctionsStatus: 'clear', licensingStatus: 'surplus_lines', ...ctx }).status).toBe('passed');
    });

    it('fails hard on a sanctions hit', () => {
      expect(rollupClearance({ sanctionsStatus: 'hit', licensingStatus: 'admitted', ...ctx }).status).toBe('failed');
    });

    it('fails hard when the carrier is not authorized', () => {
      expect(rollupClearance({ sanctionsStatus: 'clear', licensingStatus: 'not_authorized', ...ctx }).status).toBe('failed');
    });

    it('routes a potential match to review', () => {
      expect(rollupClearance({ sanctionsStatus: 'potential_match', licensingStatus: 'admitted', ...ctx }).status).toBe('review');
    });

    it('routes a licensing gap to review', () => {
      expect(rollupClearance({ sanctionsStatus: 'clear', licensingStatus: 'review', ...ctx }).status).toBe('review');
    });

    it('always emits the two named checks', () => {
      const { checks } = rollupClearance({ sanctionsStatus: 'clear', licensingStatus: 'admitted', ...ctx });
      expect(checks.map((c) => c.key)).toEqual(['sanctions', 'carrier_licensing']);
    });
  });
});
