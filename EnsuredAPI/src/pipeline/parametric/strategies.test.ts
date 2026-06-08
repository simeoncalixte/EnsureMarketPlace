import {
  parametricPremiumRatingStrategy,
  parametricTriggerModelStrategy,
} from './strategies';
import { selectModelStrategy, selectRatingStrategy } from '../registry/strategy';

/**
 * Slice 5.1 — parametric strategy tests (DB-free) + registry wiring.
 */

const CITED_CURVE = {
  indexName: 'wind',
  payoutFormula: 'min(limit,(wind-130)*125000)',
  probabilitySource: 'Structurer-cited HURDAT2 wind exceedance curve, 2024',
  exceedancePoints: [
    { indexValue: 140, annualExceedanceProbability: 0.05 },
    { indexValue: 160, annualExceedanceProbability: 0.02 },
    { indexValue: 200, annualExceedanceProbability: 0.005 },
  ],
};

describe('registry wiring', () => {
  it('selectModelStrategy resolves parametric_trigger to the real strategy', () => {
    expect(selectModelStrategy('parametric_trigger').method).toBe('parametric_trigger');
  });
  it('selectRatingStrategy resolves parametric_premium to the real strategy', () => {
    expect(selectRatingStrategy('parametric_premium').method).toBe('parametric_premium');
  });
  it('unknown method still falls back to the generic default (unchanged)', () => {
    expect(selectModelStrategy('nope').method).toBe('generic_burning_cost');
    expect(selectRatingStrategy('nope').method).toBe('generic_loss_ratio');
  });
});

describe('parametricTriggerModelStrategy', () => {
  it('computes expected loss from canonical data.parametric (hand-verified 118,750)', () => {
    const out = parametricTriggerModelStrategy.run(
      { data: { parametric: CITED_CURVE } },
      { limit: 5_000_000 },
    );
    expect(out.method).toBe('parametric_trigger');
    expect(out.expectedLossCost).toBeCloseTo(118_750, 4);
    expect((out.detail as any).basisRisk).toBe(true);
    expect((out.detail as any).bands).toHaveLength(3);
    expect((out.detail as any).probabilitySource).toMatch(/HURDAT2/);
  });

  it('null expectedLossCost (with reason) when no cited probability', () => {
    const out = parametricTriggerModelStrategy.run(
      { data: { parametric: { ...CITED_CURVE, probabilitySource: '' } } },
      { limit: 5_000_000 },
    );
    expect(out.expectedLossCost).toBeNull();
    expect((out.detail as any).modelable).toBe(false);
    expect((out.detail as any).reason).toBe('no_cited_probability_source');
  });
});

describe('parametricPremiumRatingStrategy', () => {
  it('loss-ratio build-up + ROL/LOL', () => {
    // expectedLoss 118,750, targetLossRatio 0.75 → premium = 158,333.33.
    // limit 5,000,000 → ROL = 0.0316..., LOL = 0.02375.
    const out = parametricPremiumRatingStrategy.price(
      {},
      { expectedLoss: 118_750, targetLossRatio: 0.75, limit: 5_000_000 },
    );
    expect(out.technicalPremium).toBeCloseTo(158_333.33, 1);
    expect((out.detail as any).buildUp).toBe('loss_ratio');
    expect((out.detail as any).rateOnLine).toBeCloseTo(158_333.33 / 5_000_000, 6);
    expect((out.detail as any).lossOnLine).toBeCloseTo(118_750 / 5_000_000, 6);
    // premium > expectedLoss → no sanity flag.
    expect((out.detail as any).flags).not.toContain('premium:not_above_expected_loss');
  });

  it('explicit load build-up: expectedLoss×(1+riskLoad) grossed up for expense+margin', () => {
    // EL 100,000; riskLoad 0.2 → 120,000; /(1-0.15-0.1)=/0.75 → 160,000.
    const out = parametricPremiumRatingStrategy.price(
      {},
      { expectedLoss: 100_000, riskLoad: 0.2, expenseRatio: 0.15, marginTarget: 0.1, limit: 4_000_000 },
    );
    expect(out.technicalPremium).toBeCloseTo(160_000, 4);
    expect((out.detail as any).buildUp).toBe('load_buildup');
    expect((out.detail as any).rateOnLine).toBeCloseTo(0.04, 6);
  });

  it('sanity flag when premium <= expectedLoss', () => {
    // targetLossRatio > 1 would make premium < expectedLoss.
    const out = parametricPremiumRatingStrategy.price(
      {},
      { expectedLoss: 100_000, targetLossRatio: 1.25, limit: 1_000_000 },
    );
    expect((out.detail as any).flags).toContain('premium:not_above_expected_loss');
  });

  it('no expected loss ⇒ null premium, flagged', () => {
    const out = parametricPremiumRatingStrategy.price({}, { targetLossRatio: 0.75, limit: 1_000_000 });
    expect(out.technicalPremium).toBeNull();
    expect((out.detail as any).flags).toContain('premium:no_expected_loss');
  });
});
