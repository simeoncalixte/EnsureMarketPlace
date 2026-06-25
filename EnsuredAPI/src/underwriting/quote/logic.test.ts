import {
  asMoneyString,
  asRateString,
  buildQuoteSnapshot,
  defaultValidUntil,
  formatQuoteNumber,
  nextVersionNumber,
  resolveTransition,
} from './logic';

describe('quote logic — numbering & versioning', () => {
  it('formats a deterministic, zero-padded quote number', () => {
    expect(formatQuoteNumber(7)).toBe('Q-000007');
    expect(formatQuoteNumber(123456)).toBe('Q-123456');
  });

  it('appends versions starting at 1', () => {
    expect(nextVersionNumber(null)).toBe(1);
    expect(nextVersionNumber(undefined)).toBe(1);
    expect(nextVersionNumber(3)).toBe(4);
  });

  it('derives validUntil from the issue time + N days', () => {
    const issued = new Date('2026-06-13T00:00:00.000Z');
    expect(defaultValidUntil(issued).toISOString()).toBe('2026-07-13T00:00:00.000Z'); // +30d default
    expect(defaultValidUntil(issued, 14).toISOString()).toBe('2026-06-27T00:00:00.000Z');
  });
});

describe('quote logic — decimal formatting', () => {
  it('formats money to 2dp and rates to 4dp, stripping symbols', () => {
    expect(asMoneyString('$5,000,000')).toBe('5000000.00');
    expect(asMoneyString(250000)).toBe('250000.00');
    expect(asMoneyString(null)).toBeNull();
    expect(asRateString('12.5%')).toBe('12.5000');
    expect(asRateString(0.15)).toBe('0.1500');
  });
});

describe('quote logic — offer snapshot', () => {
  it('defaults premium to the priced technical premium', () => {
    const snap = buildQuoteSnapshot({ pricingPremium: '1234567.89' });
    expect(snap.premium).toBe('1234567.89');
    expect(snap.currency).toBe('USD');
  });

  it('lets an underwriter override premium and terms on top of the price', () => {
    const snap = buildQuoteSnapshot({
      pricingPremium: '1000000',
      overrides: {
        premium: 1_150_000,
        currency: 'GBP',
        commissionRate: 0.15,
        coverageLimit: '10,000,000',
        deductible: 250000,
        terms: { subjectivities: ['signed application'] },
      },
    });
    expect(snap.premium).toBe('1150000.00');
    expect(snap.currency).toBe('GBP');
    expect(snap.commissionRate).toBe('0.1500');
    expect(snap.coverageLimit).toBe('10000000.00');
    expect(snap.deductible).toBe('250000.00');
    expect(snap.termsJson).toEqual({ subjectivities: ['signed application'] });
  });

  it('refuses to build an offer with no price at all', () => {
    expect(() => buildQuoteSnapshot({ pricingPremium: null })).toThrow(/quote_requires_premium/);
  });
});

describe('quote logic — lifecycle state machine', () => {
  it('allows the documented transitions from issued', () => {
    expect(resolveTransition('accept', 'issued')).toEqual({ ok: true, to: 'accepted' });
    expect(resolveTransition('decline', 'issued')).toEqual({ ok: true, to: 'declined' });
    expect(resolveTransition('withdraw', 'issued')).toEqual({ ok: true, to: 'withdrawn' });
    expect(resolveTransition('expire', 'issued')).toEqual({ ok: true, to: 'expired' });
  });

  it('allows withdraw from accepted, but not accept twice', () => {
    expect(resolveTransition('withdraw', 'accepted')).toEqual({ ok: true, to: 'withdrawn' });
    expect(resolveTransition('accept', 'accepted')).toEqual({ ok: false, reason: 'invalid_transition:accepted->accepted' });
  });

  it('blocks transitions out of terminal states', () => {
    expect(resolveTransition('accept', 'bound').ok).toBe(false);
    expect(resolveTransition('decline', 'declined').ok).toBe(false);
    expect(resolveTransition('withdraw', 'withdrawn').ok).toBe(false);
  });
});
