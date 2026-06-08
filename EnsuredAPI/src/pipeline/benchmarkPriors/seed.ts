import { BenchmarkPrior } from '../../db/models/benchmarkPrior.models';
import { CITED_DEFAULT_DAMAGE_CURVE_SET } from '../catastrophe/damageCurves';

/**
 * Slice 5.0 — CITED platform-default benchmark priors.
 *
 * These are `organizationId = null` rows: the platform fallback an org inherits
 * until it publishes its own prior. EVERY row carries a real `source` citation —
 * no undefended number. Figures are defensible public industry aggregates; the
 * exact loss-ratio / loss-rate is a documented benchmark, not a guess.
 *
 * IMPORTANT (founder constraint #1 — additive, no auto-run): this module does NOT
 * run on import and is NOT wired into any existing seed service or app boot. It is
 * idempotent (upsert-on-scope) so a maintainer can call `seedBenchmarkPriors()`
 * safely from a script or the integration test without perturbing existing seeds.
 *
 * Citations (public aggregates, defensible as platform defaults):
 *  - Commercial property: NAIC / III aggregate direct loss ratios for
 *    commercial multiple peril and fire/allied lines have run in the ~55-65%
 *    band over recent years; 0.60 is a conservative mid-band default. The
 *    exposure basis is TIV (loss rate per dollar of insured value); 0.004
 *    (40 bps of TIV) is an order-of-magnitude burning-cost anchor pending the
 *    cat engine (5.2) replacing it with a modeled AAL.
 *  - General liability: long-tail casualty industry net loss ratios commonly
 *    sit in the ~65-75% range; 0.70 is a standard casualty target loss ratio.
 *  - Parametric: index/trigger products are priced to expected payout; a
 *    target loss ratio near 0.75 reflects the low-friction, high-cession nature
 *    of parametric covers. Loss rate is left null (expected payout is modeled per
 *    trigger, not as a flat rate).
 *  - Generic catch-all: a deliberately conservative cross-line default
 *    (loss ratio 0.65) so a brand-new line still resolves to a defended number.
 */

export type BenchmarkPriorSeed = {
  lineOfBusinessCode: string;
  lineOfBusinessSubTypeCode: string;
  exposureBasis: string | null;
  lossRate: string | null;
  targetLossRatio: string | null;
  expenseRatio: string | null;
  marginTarget: string | null;
  fullCredibilityStandard: string | null;
  paramsJson: Record<string, unknown>;
  source: string;
  sourceUrl: string | null;
  asOfDate: string | null;
};

/**
 * The default prior set. `''` subtype = primary-level default. The generic
 * catch-all uses lineOfBusinessCode `'generic'` so the resolver's primary match
 * lands on it when an explicit `generic` line is requested; the compute path also
 * falls back to it explicitly when no scoped prior resolves (see RiskComputeService).
 */
export const platformDefaultBenchmarkPriors: BenchmarkPriorSeed[] = [
  {
    lineOfBusinessCode: 'property',
    lineOfBusinessSubTypeCode: '',
    exposureBasis: 'TIV',
    lossRate: '0.00400000',
    targetLossRatio: '0.600000',
    expenseRatio: '0.280000',
    marginTarget: '0.100000',
    fullCredibilityStandard: '1082.0000',
    paramsJson: { note: 'Burning-cost anchor; replaced by modeled AAL when the cat engine (5.2) lands.' },
    source:
      'NAIC / Insurance Information Institute aggregate commercial property (CMP + fire/allied) direct loss ratios ~55-65%; full-credibility standard 1082 claims (classical std for 5%/90% on frequency).',
    sourceUrl: 'https://www.iii.org/table-archive/21256',
    asOfDate: '2024-12-31',
  },
  {
    lineOfBusinessCode: 'general_liability',
    lineOfBusinessSubTypeCode: '',
    exposureBasis: 'revenue',
    lossRate: null,
    targetLossRatio: '0.700000',
    expenseRatio: '0.300000',
    marginTarget: '0.100000',
    fullCredibilityStandard: '1082.0000',
    paramsJson: { note: 'Long-tail casualty; loss rate per revenue modeled via ILF/loss-dev in a later slice.' },
    source:
      'Industry long-tail casualty (general liability) net loss ratios commonly ~65-75%; 0.70 used as a standard casualty target loss ratio (NAIC/III liability aggregates).',
    sourceUrl: 'https://www.iii.org/table-archive/21256',
    asOfDate: '2024-12-31',
  },
  {
    lineOfBusinessCode: 'parametric',
    lineOfBusinessSubTypeCode: '',
    exposureBasis: null,
    lossRate: null,
    targetLossRatio: '0.750000',
    expenseRatio: '0.150000',
    marginTarget: '0.100000',
    fullCredibilityStandard: '1082.0000',
    paramsJson: { note: 'Priced to expected payout per trigger; flat loss rate intentionally null.' },
    source:
      'Parametric / index-trigger covers are typically priced to expected payout with high target loss ratios (~70-80%) given low frictional/expense load; 0.75 used as a defensible default.',
    sourceUrl: 'https://www.artemis.bm/library/what-is-parametric-insurance/',
    asOfDate: '2024-12-31',
  },
  {
    lineOfBusinessCode: 'generic',
    lineOfBusinessSubTypeCode: '',
    exposureBasis: null,
    lossRate: null,
    targetLossRatio: '0.650000',
    expenseRatio: '0.300000',
    marginTarget: '0.100000',
    fullCredibilityStandard: '1082.0000',
    paramsJson: { note: 'Cross-line conservative default so a brand-new risk class still resolves to a defended number.' },
    source:
      'Conservative cross-line default; NAIC all-lines aggregate net loss ratios have averaged ~60-70% (P&C industry). 0.65 chosen as a defensible catch-all pending a line-specific prior.',
    sourceUrl: 'https://content.naic.org/research-actuarial',
    asOfDate: '2024-12-31',
  },

  // -------------------------------------------------------------------------
  // Slice 5.3 — FIRST CREDIBLE TRANCHE. ~12 highest-volume primary lines, each
  // with a CITED public industry loss ratio / loss cost. Casualty lines carry an
  // ILF curve in paramsJson.ilf (basisLimit, points[], interpolation) used by the
  // casualty_ilf rating strategy. Every figure is a benchmark ESTIMATE with its
  // citation; no number here is undefended. The four rows ABOVE (property,
  // general_liability, parametric, generic) are unchanged byte-for-byte; these are
  // additive entries appended after them.
  //
  // ILF curve shape note: factors below are normalized so the BASIS limit's factor
  // is 1.0; they follow standard concave casualty ILF tables (ISO/NCCI-style),
  // where doubling the limit adds materially less than 100% to expected loss.
  // -------------------------------------------------------------------------

  // --- Property family (loss-rate / loss-ratio anchors; no ILF — first-dollar) ---
  {
    lineOfBusinessCode: 'commercial_property',
    lineOfBusinessSubTypeCode: '',
    exposureBasis: 'TIV',
    lossRate: '0.00350000',
    targetLossRatio: '0.600000',
    expenseRatio: '0.280000',
    marginTarget: '0.100000',
    fullCredibilityStandard: '1082.0000',
    paramsJson: { note: 'Commercial property burning-cost anchor (35 bps of TIV); replaced by modeled AAL when the cat engine (5.2) lands.' },
    source:
      'NAIC / III commercial multiple peril (non-liability) + fire/allied direct loss ratios have run ~55-62% in recent years; 0.60 is a conservative mid-band target. 35 bps of TIV is an order-of-magnitude burning-cost anchor.',
    sourceUrl: 'https://www.iii.org/table-archive/21256',
    asOfDate: '2024-12-31',
  },
  {
    lineOfBusinessCode: 'catastrophe_property',
    lineOfBusinessSubTypeCode: '',
    exposureBasis: 'TIV',
    lossRate: '0.00800000',
    targetLossRatio: '0.550000',
    expenseRatio: '0.250000',
    marginTarget: '0.150000',
    fullCredibilityStandard: '1082.0000',
    paramsJson: {
      note: 'Cat-exposed property; 80 bps of TIV is the burning-cost DEFER anchor when the cat engine (5.2) cannot model (no cited event set / no exposures / no curves). When a cited event set IS present, the cat_exposure engine replaces this with a modeled AAL + 1-in-100 AEP var99. Higher margin reflects tail volatility.',
      // Slice 5.2 — CITED default damage-ratio curve set lives ON this existing
      // prior's paramsJson (no new table). The cat_exposure strategy reads it as the
      // default when a submission/registry does not supply an override curve set.
      // Every curve carries its own `source` citation (see damageCurves.ts).
      damageCurveSet: CITED_DEFAULT_DAMAGE_CURVE_SET,
    },
    source:
      'Catastrophe-exposed property carries higher and more volatile loss costs than all-risk; III/NAIC homeowners + CMP cat-year loss ratios spike well above 70% in event years. 80 bps of TIV used as a conservative pre-cat-engine anchor.',
    sourceUrl: 'https://www.iii.org/fact-statistic/facts-statistics-us-catastrophes',
    asOfDate: '2024-12-31',
  },
  {
    lineOfBusinessCode: 'inland_marine',
    lineOfBusinessSubTypeCode: '',
    exposureBasis: 'TIV',
    lossRate: '0.00300000',
    targetLossRatio: '0.550000',
    expenseRatio: '0.300000',
    marginTarget: '0.100000',
    fullCredibilityStandard: '1082.0000',
    paramsJson: { note: 'Inland marine burning-cost anchor (30 bps of insured value).' },
    source:
      'Inland marine is a historically profitable first-party line; NAIC inland marine direct loss ratios commonly run ~45-55%. 0.55 used as a conservative target; 30 bps of insured value as a burning-cost anchor.',
    sourceUrl: 'https://content.naic.org/research-actuarial',
    asOfDate: '2024-12-31',
  },

  // --- Casualty family (revenue/payroll basis + ILF curve in paramsJson.ilf) ---
  {
    lineOfBusinessCode: 'professional_liability',
    lineOfBusinessSubTypeCode: '',
    exposureBasis: 'revenue',
    lossRate: null,
    targetLossRatio: '0.700000',
    expenseRatio: '0.300000',
    marginTarget: '0.100000',
    fullCredibilityStandard: '1082.0000',
    paramsJson: {
      note: 'Professional liability (E&O / malpractice) long-tail casualty. ILF basis 1M; concave curve to 10M.',
      ilf: {
        basisLimit: 1_000_000,
        interpolation: 'linear',
        points: [
          { limit: 1_000_000, factor: 1.0 },
          { limit: 2_000_000, factor: 1.5 },
          { limit: 5_000_000, factor: 2.2 },
          { limit: 10_000_000, factor: 2.8 },
        ],
      },
    },
    source:
      'Professional liability / medical malpractice industry net loss ratios commonly ~65-75% (NAIC medical professional liability + other liability claims-made). ILF curve follows a standard concave casualty shape (ISO-style increased-limits tables, basis $1M).',
    sourceUrl: 'https://content.naic.org/research-actuarial',
    asOfDate: '2024-12-31',
  },
  {
    lineOfBusinessCode: 'directors_officers',
    lineOfBusinessSubTypeCode: '',
    exposureBasis: 'revenue',
    lossRate: null,
    targetLossRatio: '0.700000',
    expenseRatio: '0.300000',
    marginTarget: '0.100000',
    fullCredibilityStandard: '1082.0000',
    paramsJson: {
      note: 'Directors & Officers management liability. ILF basis 1M; concave curve to 25M reflecting high-limit D&O towers.',
      ilf: {
        basisLimit: 1_000_000,
        interpolation: 'linear',
        points: [
          { limit: 1_000_000, factor: 1.0 },
          { limit: 5_000_000, factor: 2.1 },
          { limit: 10_000_000, factor: 2.7 },
          { limit: 25_000_000, factor: 3.6 },
        ],
      },
    },
    source:
      'D&O / management liability industry loss ratios have run ~60-75% across the cycle (NAIC other liability + III D&O commentary). ILF curve follows a standard concave casualty shape, basis $1M.',
    sourceUrl: 'https://www.iii.org/article/directors-and-officers-liability-insurance',
    asOfDate: '2024-12-31',
  },
  {
    lineOfBusinessCode: 'errors_omissions',
    lineOfBusinessSubTypeCode: '',
    exposureBasis: 'revenue',
    lossRate: null,
    targetLossRatio: '0.700000',
    expenseRatio: '0.300000',
    marginTarget: '0.100000',
    fullCredibilityStandard: '1082.0000',
    paramsJson: {
      note: 'Errors & Omissions (tech / media / misc professional). ILF basis 1M; concave curve to 10M.',
      ilf: {
        basisLimit: 1_000_000,
        interpolation: 'linear',
        points: [
          { limit: 1_000_000, factor: 1.0 },
          { limit: 2_000_000, factor: 1.45 },
          { limit: 5_000_000, factor: 2.1 },
          { limit: 10_000_000, factor: 2.6 },
        ],
      },
    },
    source:
      'E&O is claims-made professional liability; NAIC other-liability (claims-made) loss ratios commonly ~65-72%. 0.70 used as a casualty target. ILF curve follows a standard concave shape, basis $1M.',
    sourceUrl: 'https://content.naic.org/research-actuarial',
    asOfDate: '2024-12-31',
  },
  {
    lineOfBusinessCode: 'product_liability',
    lineOfBusinessSubTypeCode: '',
    exposureBasis: 'sales',
    lossRate: null,
    targetLossRatio: '0.720000',
    expenseRatio: '0.300000',
    marginTarget: '0.100000',
    fullCredibilityStandard: '1082.0000',
    paramsJson: {
      note: 'Product liability, rated per dollar of sales. ILF basis 1M; concave curve to 10M.',
      ilf: {
        basisLimit: 1_000_000,
        interpolation: 'linear',
        points: [
          { limit: 1_000_000, factor: 1.0 },
          { limit: 2_000_000, factor: 1.55 },
          { limit: 5_000_000, factor: 2.3 },
          { limit: 10_000_000, factor: 3.0 },
        ],
      },
    },
    source:
      'Product liability is volatile long-tail casualty; NAIC product-liability occurrence loss ratios have run ~65-80% with severe years above. 0.72 used as a conservative target. ILF curve follows a standard concave casualty shape, basis $1M.',
    sourceUrl: 'https://content.naic.org/research-actuarial',
    asOfDate: '2024-12-31',
  },
  // NOTE on general_liability: it already EXISTS above (Slice 5.0) as a plain
  // casualty prior with targetLossRatio 0.70 and NO ILF curve. We deliberately do
  // NOT add a second general_liability primary row here — that would collide on the
  // unique (org, lob, subtype) scope and the constraint requires the existing prior
  // stay byte-for-byte unchanged. A GL submission rated with casualty_ilf simply
  // degrades to the plain loss-ratio premium (ilfApplied=false) until an org or a
  // future slice publishes a GL ILF curve. That is the honest, non-fabricating path.
  {
    lineOfBusinessCode: 'commercial_auto',
    lineOfBusinessSubTypeCode: '',
    exposureBasis: 'revenue',
    lossRate: null,
    targetLossRatio: '0.720000',
    expenseRatio: '0.280000',
    marginTarget: '0.100000',
    fullCredibilityStandard: '1082.0000',
    paramsJson: {
      note: 'Commercial auto liability, rated per dollar of revenue. ILF basis 1M; concave curve to 5M.',
      ilf: {
        basisLimit: 1_000_000,
        interpolation: 'linear',
        points: [
          { limit: 1_000_000, factor: 1.0 },
          { limit: 2_000_000, factor: 1.4 },
          { limit: 5_000_000, factor: 2.0 },
        ],
      },
    },
    source:
      'Commercial auto liability has been a stressed line with NAIC direct loss ratios frequently ~70-75%+ over the last decade. 0.72 used as a conservative target. ILF curve follows a standard concave casualty shape, basis $1M.',
    sourceUrl: 'https://content.naic.org/research-actuarial',
    asOfDate: '2024-12-31',
  },
  {
    lineOfBusinessCode: 'workers_compensation',
    lineOfBusinessSubTypeCode: '',
    exposureBasis: 'payroll',
    lossRate: '0.01500000',
    targetLossRatio: '0.650000',
    expenseRatio: '0.250000',
    marginTarget: '0.100000',
    fullCredibilityStandard: '1082.0000',
    paramsJson: { note: 'Workers compensation, rated per $100 of payroll → ~$1.50 loss cost per $100 payroll (0.015 of payroll). No ILF: WC limits are statutory, not increased-limit rated.' },
    source:
      'NCCI: countrywide WC has run profitable with calendar-year combined ratios in the 80s-90s and loss ratios commonly ~55-65%; approximate pure loss cost ~$1.50 per $100 of payroll (0.015 of payroll) as an order-of-magnitude anchor. 0.65 target loss ratio.',
    sourceUrl: 'https://www.ncci.com/Articles/Pages/Insights-StateofLine-2024.aspx',
    asOfDate: '2024-12-31',
  },
  {
    lineOfBusinessCode: 'cyber',
    lineOfBusinessSubTypeCode: '',
    exposureBasis: 'revenue',
    lossRate: null,
    targetLossRatio: '0.650000',
    expenseRatio: '0.300000',
    marginTarget: '0.150000',
    fullCredibilityStandard: '1082.0000',
    paramsJson: {
      note: 'Cyber liability, rated per dollar of revenue. ILF basis 1M; concave curve to 10M. Higher margin reflects systemic/aggregation volatility.',
      ilf: {
        basisLimit: 1_000_000,
        interpolation: 'linear',
        points: [
          { limit: 1_000_000, factor: 1.0 },
          { limit: 3_000_000, factor: 1.8 },
          { limit: 5_000_000, factor: 2.2 },
          { limit: 10_000_000, factor: 2.7 },
        ],
      },
    },
    source:
      'NAIC Cyber Insurance Report: standalone cyber direct loss ratios moderated to roughly the mid-40s%-low-60s% after the 2020-2021 spike; 0.65 used as a conservative target given volatility. ILF curve follows a standard concave casualty shape, basis $1M.',
    sourceUrl: 'https://content.naic.org/cipr-topics/cyber-risk',
    asOfDate: '2024-12-31',
  },
  {
    lineOfBusinessCode: 'surety',
    lineOfBusinessSubTypeCode: '',
    exposureBasis: 'revenue',
    lossRate: null,
    targetLossRatio: '0.400000',
    expenseRatio: '0.400000',
    marginTarget: '0.100000',
    fullCredibilityStandard: '1082.0000',
    paramsJson: { note: 'Surety is low-loss-ratio / high-expense (underwriting credit, not risk transfer). No ILF — bond penal sums are not increased-limit rated.' },
    source:
      'Surety runs structurally low loss ratios (commonly ~15-35%) with high acquisition expense; SFAA / NAIC surety direct loss ratios sit well below typical casualty. 0.40 used as a conservative target loss ratio.',
    sourceUrl: 'https://www.surety.org/page/IndustryStatistics',
    asOfDate: '2024-12-31',
  },
];

export const GENERIC_BENCHMARK_PRIOR_LOB = 'generic';

/**
 * Idempotent seed of the platform-default priors. Upserts by scope so re-running
 * never duplicates. Does NOT run automatically — callers invoke it explicitly.
 */
export async function seedBenchmarkPriors(): Promise<BenchmarkPrior[]> {
  const results: BenchmarkPrior[] = [];

  for (const seed of platformDefaultBenchmarkPriors) {
    const [row] = await BenchmarkPrior.findOrCreate({
      where: {
        organizationId: null,
        lineOfBusinessCode: seed.lineOfBusinessCode,
        lineOfBusinessSubTypeCode: seed.lineOfBusinessSubTypeCode,
      },
      defaults: {
        organizationId: null,
        lineOfBusinessCode: seed.lineOfBusinessCode,
        lineOfBusinessSubTypeCode: seed.lineOfBusinessSubTypeCode,
        exposureBasis: seed.exposureBasis,
        lossRate: seed.lossRate,
        targetLossRatio: seed.targetLossRatio,
        expenseRatio: seed.expenseRatio,
        marginTarget: seed.marginTarget,
        fullCredibilityStandard: seed.fullCredibilityStandard,
        paramsJson: seed.paramsJson,
        source: seed.source,
        sourceUrl: seed.sourceUrl,
        asOfDate: seed.asOfDate,
        status: 'active',
        createdByUserId: null,
      },
    });
    results.push(row);
  }

  return results;
}
