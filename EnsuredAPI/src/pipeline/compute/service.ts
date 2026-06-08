import {
  CanonicalSubmission,
  Deal,
  ModelRun,
  Pricing,
  PricingVersion,
  RiskMetric,
  Submission,
} from '../../db/models';
import { resolveRiskClass } from '../registry/resolve';
import { selectModelStrategy, selectRatingStrategy } from '../registry/strategy';
import { GENERIC_MODELING_METHOD } from '../registry/types';
import type {
  ModelOutput,
  PricingOutput,
  RiskClassResolution,
  RiskModelStrategyInput,
} from '../registry/types';
import {
  BenchmarkPriorResolution,
  resolveBenchmarkPrior,
} from '../benchmarkPriors/resolve';
import { GENERIC_BENCHMARK_PRIOR_LOB } from '../benchmarkPriors/seed';
import {
  assembleParams,
  deriveReturnAndRisk,
  ExposureContext,
  mapToPersistence,
} from './assemble';
import { blend, BlendResult, credibilityZ } from './credibility';
import { PARAMETRIC_MODELING_METHOD } from '../parametric/strategies';
import { CASUALTY_ILF_RATING_METHOD } from '../casualty/strategies';
import { CAT_MODELING_METHOD } from '../catastrophe/strategies';
import { resolveCurveSet } from '../catastrophe/damageCurves';
import { parseEventSet } from '../catastrophe/eventLoss';
import {
  assignZonesAndAccumulate,
  loadCatExposures,
} from '../catastrophe/service';
import type { CatExposure } from '../catastrophe/eventLoss';
import type { AccumulationResult } from '../catastrophe/accumulation';

/**
 * Slice 5.0 — RiskComputeService: the MISSING compute path.
 *
 * `pipeline/index.ts processSubmission()` is an empty stub; the live pipeline ends
 * at workflow and ALL loss/price numbers today are written by the seed services.
 * This service BUILDS the compute path that was missing — it does NOT swap a live
 * multiplier and does NOT touch the seed services.
 *
 * Flow (computeForSubmission):
 *   resolve risk class → resolve benchmark prior → assembleParams →
 *   selectModelStrategy(method).run → selectRatingStrategy(method).price →
 *   apply credibility blend (experience = null / n = 0 today ⇒ Z = 0 ⇒ pure prior)
 *   → persist a ModelRun + a NEW PricingVersion + (when a Deal exists) a RiskMetric,
 *   with FULL provenance + confidence in parametersJson / assumptionsJson.
 *
 * HONESTY (founder constraint #2):
 *   - var99 / tail metrics stay NULL with a "not modeled until cat engine (5.2)"
 *     note — we do NOT invent tail risk.
 *   - expectedReturn / riskScore are DERIVED from the build-up or left null+flagged
 *     — never the old constants 0.1280 / 0.6120.
 *   - Z = 0 is reported truthfully because no internal loss experience is accrued;
 *     we do NOT fake experience.
 *
 * TOTAL/SAFE: on resolution failure it falls back to the generic strategy + Z = 0;
 * it never throws out of a non-error path. A genuine DB-write failure still
 * propagates (a real persistence failure is a real failure).
 */

const COMPUTE_MODEL_VERSION = 'riskcompute-5.0';

export type ComputeProvenance = {
  method: { modeling: string; rating: string };
  resolvedFrom: RiskClassResolution['resolvedFrom'];
  priorResolvedFrom: BenchmarkPriorResolution['resolvedFrom'];
  priorSource: string | null;
  priorSourceUrl: string | null;
  z: number;
  confidenceLabel: BlendResult['confidenceLabel'];
  inputs: Record<string, unknown>;
  blendDetail: {
    basis: BlendResult['basis'];
    experience: number | null;
    prior: number | null;
    blended: number | null;
  };
  modelDetail: Record<string, unknown>;
  pricingDetail: Record<string, unknown>;
  notModeled: string[];
  flags: string[];
  note: string;
  /**
   * Slice 5.1 — present ONLY for parametric_trigger submissions; undefined for
   * every other method (so non-parametric provenance is unchanged). Carries the
   * cited probability source, per-band breakdown, ROL/LOL, and the basis-risk flag.
   */
  parametric?: {
    modelable: boolean;
    reason: string | null;
    probabilitySource: string | null;
    indexName: string | null;
    bands: unknown;
    rateOnLine: number | null;
    lossOnLine: number | null;
    coverageLimit: number | null;
    basisRisk: true;
    buildUp: string | null;
  };
  /**
   * Slice 5.3 — present ONLY for casualty_ilf submissions; undefined for every
   * other rating method (so non-casualty provenance is unchanged). Carries whether
   * the ILF was applied, the factor + curve basis, the build-up, and ROL/LOL.
   */
  casualty?: {
    ilfApplied: boolean;
    ilfFactor: number | null;
    ilfMethod: string | null;
    ilfReason: string | null;
    basisLimit: number | null;
    coverageLimit: number | null;
    buildUp: string | null;
    rateOnLine: number | null;
    lossOnLine: number | null;
  };
  /**
   * Slice 5.2 — present ONLY for cat_exposure submissions; undefined for every
   * other modeling method (so non-cat provenance is unchanged). Carries the cited
   * event-set + damage-curve sources, the seed, the return-period losses, the
   * accumulation summary, and the var99↔1-in-100-AEP mapping for audit.
   */
  cat?: {
    modelable: boolean;
    reason: string | null;
    exposureSource: 'exposure_units' | 'canonical_data' | 'none';
    exposureCount: number;
    eventCount: number;
    eventSetSource: string | null;
    damageCurveSource: string | null;
    simYears: number | null;
    seed: number | null;
    aal: number | null;
    pml: number | null;
    pmlReturnPeriod: number | null;
    oep: unknown;
    aep: unknown;
    tvar: unknown;
    /** The 1-in-100 AEP value written into the var99 column. */
    var99Mapping: { metric: '1in100_AEP_annual_aggregate'; value: number | null };
    zonesAvailable: boolean;
    accumulationPartial: boolean;
    accumulationByZone: unknown;
    hhi: number | null;
  };
};

export type ComputeResult = {
  submissionId: number;
  modelRunId: number;
  pricingId: number;
  pricingVersionId: number;
  versionNumber: number;
  riskMetricId: number | null;
  expectedLoss: string | null;
  /**
   * Slice 5.2 — populated (= 1-in-100 AEP) ONLY for a modeled cat_exposure run;
   * stays NULL for every non-cat method exactly as before (Slices 5.0/5.1/5.3).
   */
  var99: string | null;
  premium: string;
  expectedReturn: string | null;
  riskScore: string | null;
  provenance: ComputeProvenance;
};

const TAIL_NOT_MODELED_NOTE =
  'var99 / tail metrics are NOT modeled for this method. Held NULL deliberately rather than fabricated.';

const CAT_VAR99_NOTE =
  'var99 = the 1-in-100 AEP (annual aggregate 99th percentile) from the seeded Monte-Carlo cat engine (Slice 5.2). Hazard event set + damage curves are DECLARED/CITED.';

/** Pull the exposure base (TIV / revenue / payroll) from canonical data, by basis. */
function deriveExposure(
  data: Record<string, unknown> | null | undefined,
  exposureBasis: string | null | undefined,
): ExposureContext {
  if (!data || typeof data !== 'object') {
    return { exposureBase: null, exposureBasis: exposureBasis ?? null };
  }

  // Canonical keys we look for, in priority order. We read the basis-specific key
  // first, then common synonyms. All optional — null is a legitimate state.
  const candidateKeys = [
    'financials.tiv',
    'financials.totalInsuredValue',
    'exposure.tiv',
    'financials.revenue',
    'financials.payroll',
    'financials.limit',
    'exposureBase',
    'tiv',
  ];

  for (const key of candidateKeys) {
    const raw = (data as Record<string, unknown>)[key];
    if (raw != null) {
      const parsed = typeof raw === 'number' ? raw : Number(raw);
      if (Number.isFinite(parsed)) {
        return { exposureBase: parsed, exposureBasis: exposureBasis ?? null };
      }
    }
  }

  return { exposureBase: null, exposureBasis: exposureBasis ?? null };
}

/**
 * Slice 5.1 — read the coverage limit for parametric pricing. Canonical
 * `data.financials.limit` (pre-deal) first, then a Deal's coverageLimit when one
 * exists. Returns null when neither is present (the limit variable simply won't
 * bind and ROL/LOL stay null). Pure read; no fabrication.
 */
function readCoverageLimit(
  data: Record<string, unknown> | null | undefined,
  dealCoverageLimit: unknown,
): number | null {
  const fromData = data ? (data as Record<string, unknown>)['financials.limit'] : undefined;
  for (const raw of [fromData, dealCoverageLimit]) {
    if (raw != null) {
      const parsed = typeof raw === 'number' ? raw : Number(raw);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

/**
 * Compute (and persist) loss + price for a submission. See the class doc for the
 * full honesty / safety contract.
 */
export async function computeForSubmission(
  submissionId: number,
  options?: { executedByUserId?: number | null },
): Promise<ComputeResult> {
  const submission = await Submission.findByPk(submissionId);
  if (!submission) {
    throw new Error('submission_not_found');
  }
  const tenantId = submission.tenantId ?? null;

  const canonical = await CanonicalSubmission.findOne({ where: { submissionId } });
  const data = (canonical?.data ?? {}) as Record<string, unknown>;
  const primaryCode = canonical?.lineOfBusinessCode ?? null;
  const subTypeCode = canonical?.lineOfBusinessSubTypeCode ?? null;

  // 1. Resolve the risk class (total; generic default on miss/error).
  const resolution = await resolveRiskClass(tenantId, primaryCode, subTypeCode);

  // 2. Resolve the benchmark prior; fall back to the generic catch-all prior when
  //    no scoped prior resolves (so we still have a defended number).
  let priorResolution = await resolveBenchmarkPrior(tenantId, primaryCode, subTypeCode);
  if (!priorResolution.prior) {
    const generic = await resolveBenchmarkPrior(tenantId, GENERIC_BENCHMARK_PRIOR_LOB, null);
    if (generic.prior) {
      priorResolution = generic;
    }
  }
  const prior = priorResolution.prior;

  // 3. Assemble strategy params (prior → registry methodParams override).
  const exposure = deriveExposure(data, prior?.exposureBasis ?? null);
  const modelParams = assembleParams(prior, resolution.methodParams, exposure);

  // 3a. GUARDED parametric branch (Slice 5.1). Active ONLY when the resolved
  //     modeling method is 'parametric_trigger'. For every other method this block
  //     is skipped and behavior is byte-for-byte identical to Slice 5.0. We bind
  //     the coverage limit into modelParams so the parametric strategy can evaluate
  //     min(limit, ...) payouts and expose ROL/LOL. The cited exceedance curve +
  //     payout formula ride on canonical data.parametric (read by the strategy).
  const isParametric = resolution.riskModelingMethod === PARAMETRIC_MODELING_METHOD;
  let parametricCoverageLimit: number | null = null;
  if (isParametric) {
    const parametricDeal = await Deal.findOne({ where: { submissionId } });
    parametricCoverageLimit = readCoverageLimit(data, parametricDeal?.coverageLimit);
    if (parametricCoverageLimit != null) {
      modelParams.limit = parametricCoverageLimit;
    }
  }

  // 3b. GUARDED casualty-ILF branch (Slice 5.3). Active ONLY when the resolved
  //     RATING method is 'casualty_ilf'. For every other method this block is
  //     skipped and behavior is byte-for-byte identical to Slice 5.0/5.1. It binds:
  //       - the ILF curve from the EXISTING prior.paramsJson.ilf into params.ilf, and
  //       - the coverage limit into params.limit,
  //     so the casualty_ilf rating strategy can apply ILF(limit)/ILF(basisLimit).
  //     Modeling stays the (generic) burning-cost method; only rating changes.
  const isCasualtyIlf = resolution.ratingMethod === CASUALTY_ILF_RATING_METHOD;
  let casualtyCoverageLimit: number | null = null;
  if (isCasualtyIlf) {
    const priorIlf = (prior?.paramsJson as Record<string, unknown> | null | undefined)?.ilf;
    if (priorIlf != null && modelParams.ilf === undefined) {
      modelParams.ilf = priorIlf;
    }
    const casualtyDeal = await Deal.findOne({ where: { submissionId } });
    casualtyCoverageLimit = readCoverageLimit(data, casualtyDeal?.coverageLimit);
    if (casualtyCoverageLimit != null) {
      modelParams.limit = casualtyCoverageLimit;
    }
  }

  // 3c. GUARDED catastrophe branch (Slice 5.2). Active ONLY when the resolved
  //     modeling method is 'cat_exposure'. For every other method this block is
  //     skipped and behavior is byte-for-byte identical to Slice 5.0/5.1/5.3.
  //     The strategy socket is SYNC, so ALL DB work happens HERE and is passed into
  //     the strategy via `catInput`:
  //       (1) load exposures (ExposureUnit rows for the submission's policies, else
  //           CanonicalSubmission.data.exposures[]) → normalized CatExposure[];
  //       (2) CRESTA point-in-bbox zone assignment (graceful when zones unloaded);
  //       (3) assemble damage curves (cited default ⊕ override) + event set.
  //     The cited event set rides on data.catEventSet; the override curve set on
  //     data.damageCurveSet / registry methodParams.damageCurveSet.
  const isCat = resolution.riskModelingMethod === CAT_MODELING_METHOD;
  const catInput: RiskModelStrategyInput = { data };
  let catExposureSource: 'exposure_units' | 'canonical_data' | 'none' = 'none';
  let catZonesAvailable = false;
  let catAccumulation: AccumulationResult | null = null;
  if (isCat) {
    const loaded = await loadCatExposures(submissionId, data);
    catExposureSource = loaded.source;
    const zoneResult = await assignZonesAndAccumulate(loaded.exposures);
    catZonesAvailable = zoneResult.zonesAvailable;
    catAccumulation = zoneResult.accumulation;
    const zonedExposures: CatExposure[] = zoneResult.exposures;

    catInput.catExposures = zonedExposures;
    catInput.accumulation = zoneResult.accumulation;

    // Damage curve set: registry methodParams override ⊕ data override ⊕ cited default.
    const overrideCurves =
      (modelParams.damageCurveSet as unknown) ??
      (data.damageCurveSet as unknown);
    modelParams.damageCurveSet = resolveCurveSet(overrideCurves);
    // Surface the cited event set into params for the strategy (data is also read).
    if (data.catEventSet != null && modelParams.catEventSet === undefined) {
      modelParams.catEventSet = data.catEventSet;
    }
  }

  // 4. Run the modeling strategy → expected loss cost (the PRIOR-based estimate).
  //    For cat, pass the zone-resolved exposures + accumulation via catInput; for
  //    every other method the input is the plain { data } as before.
  const modelStrategy = selectModelStrategy(resolution.riskModelingMethod);
  const modelOutput: ModelOutput = modelStrategy.run(isCat ? catInput : { data }, modelParams);
  let priorLossCost = modelOutput.expectedLossCost;

  // Slice 5.2 — DEFER fallback. When the cat engine cannot model (no cited event
  //   set / no exposures / no curves) it returns expectedLossCost null. Per the
  //   founder decision, compute then falls back to the catastrophe_property
  //   BENCHMARK PRIOR (a defended burning-cost number: exposureBase × lossRate),
  //   NOT a fabricated cat number. We run the generic burning-cost model against the
  //   same prior-derived params to obtain that fallback loss cost. var99 stays NULL
  //   on this path (see the var99 population block — catVar99 only set when modeled).
  if (isCat && priorLossCost == null) {
    const fallback = selectModelStrategy(GENERIC_MODELING_METHOD).run({ data }, modelParams);
    priorLossCost = fallback.expectedLossCost;
  }

  // 5. Credibility blend. Experience is NULL and n = 0 today (no internal loss
  //    experience accrued) ⇒ Z = 0 ⇒ pure prior. Reported honestly.
  const experienceLossCost: number | null = null;
  const observedClaimCount = 0;
  const fullCredibilityStandard = prior?.fullCredibilityStandard ?? 0;
  const z = credibilityZ(observedClaimCount, fullCredibilityStandard);
  const blendedLoss = blend(experienceLossCost, priorLossCost, z);

  // 6. Run the rating strategy. It needs expectedLoss to derive a technical
  //    premium; inject the BLENDED loss cost into its params.
  const ratingParams: Record<string, unknown> = {
    ...modelParams,
    expectedLoss: blendedLoss.value,
  };
  const ratingStrategy = selectRatingStrategy(resolution.ratingMethod);
  const pricingOutput: PricingOutput = ratingStrategy.price({ data }, ratingParams);

  // 7. Derive expectedReturn / riskScore honestly (never the old constants).
  const derived = deriveReturnAndRisk(blendedLoss.value, pricingOutput.technicalPremium, ratingParams);

  const mapping = mapToPersistence(
    modelOutput,
    pricingOutput,
    blendedLoss,
    derived.expectedReturn,
    derived.riskScore,
  );

  // 7a. Slice 5.2 — var99 population. var99 stays NULL for EVERY non-cat method
  //     (mapping.var99 is null by contract). For a MODELED cat_exposure run we
  //     populate it with the 1-in-100 AEP (annual aggregate 99th percentile) the
  //     EP engine produced. A DEFERRED cat run (expectedLossCost null → fell back to
  //     the catastrophe_property benchmark prior) keeps var99 NULL (never fabricated).
  let catVar99: number | null = null;
  if (isCat && modelOutput.expectedLossCost != null) {
    const md = modelOutput.detail as Record<string, unknown>;
    const v = typeof md.var99Aep1in100 === 'number' ? md.var99Aep1in100 : null;
    if (v != null && Number.isFinite(v)) {
      catVar99 = v;
    }
  }
  const var99String: string | null = catVar99 != null ? String(catVar99) : null;

  // 8. Build the full provenance + confidence blob.
  const flags = [...derived.flags];
  if (!prior) {
    flags.push('prior:none_resolved_even_generic');
  }
  if (pricingOutput.technicalPremium == null) {
    flags.push('premium:not_derived_floored_to_zero');
  }

  // Slice 5.1 — parametric-only flags (guarded; no effect on other methods).
  if (isParametric) {
    flags.push('basisRisk:trigger_vs_actual_loss');
    if (modelOutput.expectedLossCost == null) {
      flags.push('parametric:unmodelable_fell_back_to_benchmark_low_confidence');
    }
  }

  // Slice 5.2 — cat-only flags (guarded; no effect on other methods).
  if (isCat) {
    if (modelOutput.expectedLossCost == null) {
      const md = modelOutput.detail as Record<string, unknown>;
      const reason = typeof md.reason === 'string' ? md.reason : 'unknown';
      flags.push(`cat:deferred_${reason}_fell_back_to_benchmark`);
    } else if (!catZonesAvailable) {
      flags.push('cat:accumulation_partial_cresta_zones_unloaded');
    }
  }

  const provenance: ComputeProvenance = {
    method: { modeling: modelOutput.method, rating: pricingOutput.method },
    resolvedFrom: resolution.resolvedFrom,
    priorResolvedFrom: priorResolution.resolvedFrom,
    priorSource: prior?.source ?? null,
    priorSourceUrl: prior?.sourceUrl ?? null,
    z,
    confidenceLabel: blendedLoss.confidenceLabel,
    inputs: {
      lineOfBusinessCode: resolution.lineOfBusinessCode,
      lineOfBusinessSubTypeCode: resolution.lineOfBusinessSubTypeCode,
      exposureBase: exposure.exposureBase,
      exposureBasis: modelParams.exposureBasis ?? null,
      modelParams,
      observedClaimCount,
      fullCredibilityStandard,
    },
    blendDetail: {
      basis: blendedLoss.basis,
      experience: blendedLoss.experience,
      prior: blendedLoss.prior,
      blended: blendedLoss.value,
    },
    modelDetail: modelOutput.detail,
    pricingDetail: pricingOutput.detail,
    // Slice 5.2 — var99 is no longer "not modeled" when the cat engine produced a
    // 1-in-100 AEP for it; for every other method (and a deferred cat run) it stays
    // listed as not-modeled exactly as before.
    notModeled: catVar99 != null ? [] : ['var99'],
    flags,
    note: catVar99 != null ? CAT_VAR99_NOTE : TAIL_NOT_MODELED_NOTE,
  };

  // 8a. GUARDED parametric provenance (Slice 5.1). Only attached for the
  //     parametric_trigger method; undefined otherwise so other methods'
  //     provenance is unchanged. Captures the citation, per-band breakdown,
  //     ROL/LOL, coverage limit, and the basis-risk flag for audit.
  if (isParametric) {
    const md = modelOutput.detail as Record<string, unknown>;
    const pd = pricingOutput.detail as Record<string, unknown>;
    provenance.parametric = {
      modelable: modelOutput.expectedLossCost != null,
      reason: typeof md.reason === 'string' ? md.reason : null,
      probabilitySource: typeof md.probabilitySource === 'string' ? md.probabilitySource : null,
      indexName: typeof md.indexName === 'string' ? md.indexName : null,
      bands: md.bands ?? null,
      rateOnLine: typeof pd.rateOnLine === 'number' ? pd.rateOnLine : null,
      lossOnLine: typeof pd.lossOnLine === 'number' ? pd.lossOnLine : null,
      coverageLimit: parametricCoverageLimit,
      basisRisk: true,
      buildUp: typeof pd.buildUp === 'string' ? pd.buildUp : null,
    };
  }

  // 8b. GUARDED casualty-ILF provenance (Slice 5.3). Only attached for the
  //     casualty_ilf rating method; undefined otherwise so other methods'
  //     provenance is unchanged. Captures whether the ILF was applied, the factor,
  //     the curve basis, the build-up, and ROL/LOL for audit.
  if (isCasualtyIlf) {
    const pd = pricingOutput.detail as Record<string, unknown>;
    provenance.casualty = {
      ilfApplied: pd.ilfApplied === true,
      ilfFactor: typeof pd.ilfFactor === 'number' ? pd.ilfFactor : null,
      ilfMethod: typeof pd.ilfMethod === 'string' ? pd.ilfMethod : null,
      ilfReason: typeof pd.ilfReason === 'string' ? pd.ilfReason : null,
      basisLimit: typeof pd.basisLimit === 'number' ? pd.basisLimit : null,
      coverageLimit: casualtyCoverageLimit,
      buildUp: typeof pd.buildUp === 'string' ? pd.buildUp : null,
      rateOnLine: typeof pd.rateOnLine === 'number' ? pd.rateOnLine : null,
      lossOnLine: typeof pd.lossOnLine === 'number' ? pd.lossOnLine : null,
    };
    if (pd.ilfApplied !== true) {
      flags.push('casualty:ilf_not_applied_degraded_to_loss_ratio');
    }
  }

  // 8c. GUARDED catastrophe provenance (Slice 5.2). Only attached for the
  //     cat_exposure modeling method; undefined otherwise so other methods'
  //     provenance is unchanged. Captures the cited event-set + damage-curve
  //     sources, the seed, return-period losses, accumulation, and the var99↔AEP
  //     mapping for audit.
  if (isCat) {
    const md = modelOutput.detail as Record<string, unknown>;
    const modelable = modelOutput.expectedLossCost != null;
    provenance.cat = {
      modelable,
      reason: !modelable && typeof md.reason === 'string' ? md.reason : null,
      exposureSource: catExposureSource,
      exposureCount: typeof md.exposureCount === 'number' ? md.exposureCount : 0,
      eventCount: typeof md.eventCount === 'number' ? md.eventCount : 0,
      eventSetSource: typeof md.eventSetSource === 'string' ? md.eventSetSource : null,
      damageCurveSource: typeof md.damageCurveSource === 'string' ? md.damageCurveSource : null,
      simYears: typeof md.simYears === 'number' ? md.simYears : null,
      seed: typeof md.seed === 'number' ? md.seed : null,
      aal: typeof md.aal === 'number' ? md.aal : null,
      pml: typeof md.pml === 'number' ? md.pml : null,
      pmlReturnPeriod: typeof md.pmlReturnPeriod === 'number' ? md.pmlReturnPeriod : null,
      oep: md.oep ?? null,
      aep: md.aep ?? null,
      tvar: md.tvar ?? null,
      var99Mapping: { metric: '1in100_AEP_annual_aggregate', value: catVar99 },
      zonesAvailable: catZonesAvailable,
      accumulationPartial: modelable && !catZonesAvailable,
      accumulationByZone: catAccumulation?.byZone ?? null,
      hhi: catAccumulation?.hhi ?? null,
    };
  }

  // 9. Persist. A ModelRun (always new), a NEW PricingVersion (preserve audit
  //    trail), and a RiskMetric (only when a Deal exists for the submission —
  //    RiskMetric.dealId is NOT NULL and FK to a Deal; a pre-deal submission has
  //    none, so we skip it honestly rather than fabricate a deal).
  //
  //    Slice 5.2 — outputJson gains the EP curve + accumulation for a cat run;
  //    var99 is the 1-in-100 AEP (string) for a MODELED cat run and NULL otherwise.
  const catOutput = isCat
    ? {
        epCurve: (modelOutput.detail as Record<string, unknown>).epCurve ?? null,
        oep: (modelOutput.detail as Record<string, unknown>).oep ?? null,
        aep: (modelOutput.detail as Record<string, unknown>).aep ?? null,
        pml: (modelOutput.detail as Record<string, unknown>).pml ?? null,
        tvar: (modelOutput.detail as Record<string, unknown>).tvar ?? null,
        accumulationByZone: catAccumulation?.byZone ?? null,
        var99_1in100_aep: catVar99,
      }
    : undefined;

  const modelRun = await ModelRun.create({
    submissionId,
    modelVersion: COMPUTE_MODEL_VERSION,
    parametersJson: provenance as unknown as Record<string, unknown>,
    expectedLoss: mapping.expectedLoss,
    // var99: 1-in-100 AEP for a modeled cat run; NULL for every other method (and a
    // deferred cat run) exactly as Slices 5.0/5.1/5.3.
    var99: var99String,
    outputJson: {
      model: modelOutput,
      pricing: pricingOutput,
      blend: blendedLoss,
      ...(catOutput ? { cat: catOutput } : {}),
    },
    executedByUserId: options?.executedByUserId ?? null,
  });

  // Pricing parent (one per submission) + new version (append-only).
  const [pricing] = await Pricing.findOrCreate({
    where: { submissionId },
    defaults: { submissionId, currentVersionNumber: 0 },
  });

  const lastVersion = await PricingVersion.findOne({
    where: { pricingId: pricing.id },
    order: [['versionNumber', 'DESC']],
  });
  const nextVersionNumber = (lastVersion?.versionNumber ?? 0) + 1;

  const pricingVersion = await PricingVersion.create({
    pricingId: pricing.id,
    versionNumber: nextVersionNumber,
    assumptionsJson: provenance as unknown as Record<string, unknown>,
    premium: mapping.premium,
    expectedReturn: mapping.expectedReturn,
    riskScore: mapping.riskScore,
    createdByUserId: options?.executedByUserId ?? null,
  });

  await pricing.update({ currentVersionNumber: nextVersionNumber });

  // RiskMetric only when a Deal exists (FK constraint). Otherwise null.
  // Slice 5.2 — a MODELED cat run additionally writes 'aal' and 'pml_250yr' metric
  // rows; these are additive and only ever fire for cat_exposure with a Deal.
  let riskMetricId: number | null = null;
  if (mapping.riskMetricExpectedLoss != null) {
    const deal = await Deal.findOne({ where: { submissionId } });
    if (deal) {
      const metric = await RiskMetric.create({
        dealId: deal.id,
        metricType: 'expected_loss',
        value: mapping.riskMetricExpectedLoss,
        sourceModelRunId: modelRun.id,
        calculatedAt: new Date(),
      });
      riskMetricId = metric.id;

      if (isCat && modelOutput.expectedLossCost != null) {
        const md = modelOutput.detail as Record<string, unknown>;
        const aal = typeof md.aal === 'number' ? md.aal : null;
        const pml = typeof md.pml === 'number' ? md.pml : null;
        const pmlRp = typeof md.pmlReturnPeriod === 'number' ? md.pmlReturnPeriod : 250;
        if (aal != null) {
          await RiskMetric.create({
            dealId: deal.id,
            metricType: 'aal',
            value: String(aal),
            sourceModelRunId: modelRun.id,
            calculatedAt: new Date(),
          });
        }
        if (pml != null) {
          await RiskMetric.create({
            dealId: deal.id,
            metricType: `pml_${pmlRp}yr`,
            value: String(pml),
            sourceModelRunId: modelRun.id,
            calculatedAt: new Date(),
          });
        }
      }
    }
  }

  return {
    submissionId,
    modelRunId: modelRun.id,
    pricingId: pricing.id,
    pricingVersionId: pricingVersion.id,
    versionNumber: nextVersionNumber,
    riskMetricId,
    expectedLoss: mapping.expectedLoss,
    var99: var99String,
    premium: mapping.premium,
    expectedReturn: mapping.expectedReturn,
    riskScore: mapping.riskScore,
    provenance,
  };
}
