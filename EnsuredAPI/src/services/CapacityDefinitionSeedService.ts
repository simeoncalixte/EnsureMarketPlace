import { Organization } from '../db/models/identity.models';
import { CapacityDefinition } from '../db/models';
import { CapacityGovernanceService } from './CapacityGovernanceService';

/**
 * Seeds one fully-populated, ACTIVE CapacityDefinition per organization so the
 * pipeline can be tested for adherence to organization rules.
 *
 * "1:1 with the new capacities" means each seeded definition fills the same
 * section blocks the Capacity editor UI drives — Pricing, Coverage (perils),
 * Exposure, Geography, Scoring, Workflow — AND the authoritative enforcement
 * `appetite` block that the validation pipeline actually reads (projected by
 * `definitionToAppetiteProfile`) plus the per-peril capacity map the capacity
 * stage reads. The two are kept consistent: the perils picked under Coverage are
 * exactly the `appetite.preferredPerils`, the excluded perils are
 * `appetite.excludedPerils`, the exposure limits match, etc. So what an
 * underwriter sees in the editor is precisely what the pipeline enforces.
 *
 * Different organizations are given different archetypes (round-robin) so the
 * org set collectively exercises distinct rule sets — a property-cat appetite
 * that accepts hurricane/flood with capped capacity, an attritional casualty
 * appetite that excludes every catastrophe peril, and a tight specialty
 * appetite — making pipeline-adherence tests meaningful.
 */

type WorkflowFlags = {
  allowAutoAccept: boolean;
  allowAutoDecline: boolean;
  allowAutoReferral: boolean;
  allowAutoQuote: boolean;
  allowAutoBind: boolean;
  manualReviewRequired: boolean;
};

/**
 * A capacity archetype expressed once. `toDefinitionInput` projects it into both
 * the editor section blocks and the authoritative appetite block so they stay
 * 1:1. Peril codes are the canonical bare codes from the peril taxonomy.
 */
type CapacityBlueprint = {
  key: string;
  name: string;
  code: string;
  description: string;

  // Organizational ownership (Section 2). `lineOfBusiness` is derived from the
  // primary `allowedLinesOfBusiness` so the two can't drift; department/team
  // align with the seeded governance.org.* option sets.
  department: string;
  team: string;

  // Capacity quantity (spine): the total this definition deploys and what it
  // retains net of (future) reinsurance, plus the period it resets on.
  grossCapacity: number;
  netRetention: number;
  capacityPeriodBasis: string;

  // Coverage (perils) ── also the appetite preferred/excluded peril lists.
  allowedPerils: string[];
  excludedPerils: string[];
  allowedLinesOfBusiness: string[];
  requiredClauses: string[];

  // Geography
  allowedTerritories: string[];
  excludedTerritories: string[];

  // Exposure
  maxLineSize: number;
  minCoverageLimit: number;
  maxCoverageLimit: number;
  maxAggregateExposure: number;
  /** Per-peril capacity cap (USD); the capacity stage reads this. Keyed by peril code. */
  capacityByPeril: Record<string, number>;

  // Pricing (mirrors the trimmed Pricing section).
  minimumPremium: number;
  targetProfitability: number;
  expectedLossRatio: number;
  minimumMargin: number;
  /** Minimum acceptable expected return; enforced via appetite.minTargetYield. */
  minTargetYield: number;

  // Scoring
  scoreThresholdAccept: number;
  scoreThresholdReview: number;
  scoreThresholdDecline: number;
  minDataQualityScore: number;

  // Workflow
  requiredFields: string[];
  workflow: WorkflowFlags;
};

const CURRENCY = 'USD';

const BLUEPRINTS: CapacityBlueprint[] = [
  {
    key: 'property_cat_na',
    name: 'Property Catastrophe — North America',
    code: 'SEED-PROP-CAT',
    description:
      'Coastal property catastrophe book: accepts windstorm/flood/hail with capped per-peril capacity; earthquake excluded.',
    department: 'underwriting',
    team: 'property',
    grossCapacity: 1_000_000_000,
    netRetention: 250_000_000,
    capacityPeriodBasis: 'annual',
    allowedPerils: [
      'hurricane',
      'storm_surge',
      'river_flood',
      'flash_flood',
      'hail',
      'tornado',
      'lightning',
      'water_damage',
    ],
    excludedPerils: ['earthquake', 'volcanic_eruption', 'tsunami'],
    allowedLinesOfBusiness: ['property', 'commercial_property'],
    requiredClauses: ['named_storm_deductible', 'flood_sublimit'],
    allowedTerritories: ['US', 'US/Florida', 'US/Texas', 'US/Louisiana'],
    excludedTerritories: ['US/California'],
    maxLineSize: 50_000_000,
    minCoverageLimit: 1_000_000,
    maxCoverageLimit: 250_000_000,
    maxAggregateExposure: 1_000_000_000,
    capacityByPeril: {
      hurricane: 250_000_000,
      storm_surge: 150_000_000,
      river_flood: 100_000_000,
      flash_flood: 100_000_000,
      hail: 75_000_000,
      tornado: 75_000_000,
    },
    minimumPremium: 25_000,
    targetProfitability: 15,
    expectedLossRatio: 60,
    minimumMargin: 10,
    minTargetYield: 0.12,
    scoreThresholdAccept: 75,
    scoreThresholdReview: 50,
    scoreThresholdDecline: 30,
    minDataQualityScore: 0.6,
    requiredFields: ['insuredName', 'locationAddress', 'tiv', 'perilType'],
    workflow: {
      allowAutoAccept: true,
      allowAutoDecline: true,
      allowAutoReferral: true,
      allowAutoQuote: false,
      allowAutoBind: false,
      manualReviewRequired: false,
    },
  },
  {
    key: 'commercial_casualty',
    name: 'Commercial Casualty — Attritional (No Cat)',
    code: 'SEED-COMM-CAS',
    description:
      'Attritional commercial casualty book: every catastrophe peril excluded; only fire-water-type attritional perils in appetite.',
    department: 'underwriting',
    team: 'casualty',
    grossCapacity: 100_000_000,
    netRetention: 50_000_000,
    capacityPeriodBasis: 'annual',
    allowedPerils: ['water_damage', 'sewer_backup', 'lightning', 'hail', 'straight_line_wind', 'thunderstorm'],
    excludedPerils: [
      'hurricane',
      'storm_surge',
      'river_flood',
      'flash_flood',
      'tornado',
      'earthquake',
      'wildfire',
      'tsunami',
      'volcanic_eruption',
    ],
    allowedLinesOfBusiness: ['general_liability', 'commercial_casualty'],
    requiredClauses: ['occurrence_form'],
    allowedTerritories: ['US'],
    excludedTerritories: ['US/Florida', 'US/California'],
    maxLineSize: 10_000_000,
    minCoverageLimit: 250_000,
    maxCoverageLimit: 25_000_000,
    maxAggregateExposure: 100_000_000,
    capacityByPeril: {
      water_damage: 25_000_000,
      sewer_backup: 15_000_000,
      lightning: 10_000_000,
      hail: 15_000_000,
    },
    minimumPremium: 10_000,
    targetProfitability: 12,
    expectedLossRatio: 65,
    minimumMargin: 8,
    minTargetYield: 0.09,
    scoreThresholdAccept: 70,
    scoreThresholdReview: 45,
    scoreThresholdDecline: 25,
    minDataQualityScore: 0.5,
    requiredFields: ['insuredName', 'locationAddress', 'revenue'],
    workflow: {
      allowAutoAccept: false,
      allowAutoDecline: true,
      allowAutoReferral: true,
      allowAutoQuote: false,
      allowAutoBind: false,
      manualReviewRequired: true,
    },
  },
  {
    key: 'specialty_conservative',
    name: 'Specialty — Conservative',
    code: 'SEED-SPEC-CONS',
    description:
      'Tight specialty book: narrow peril appetite, low limits, high data-quality bar; all catastrophe perils excluded.',
    department: 'underwriting',
    team: 'marine',
    grossCapacity: 40_000_000,
    netRetention: 20_000_000,
    capacityPeriodBasis: 'annual',
    allowedPerils: ['lightning', 'water_damage', 'hail'],
    excludedPerils: [
      'hurricane',
      'storm_surge',
      'river_flood',
      'flash_flood',
      'tornado',
      'earthquake',
      'wildfire',
      'tsunami',
      'volcanic_eruption',
      'landslide',
    ],
    allowedLinesOfBusiness: ['specialty', 'inland_marine'],
    requiredClauses: ['warranty_compliance'],
    allowedTerritories: ['US/NewYork', 'US/Illinois'],
    excludedTerritories: ['US/Florida', 'US/California', 'US/Texas'],
    maxLineSize: 5_000_000,
    minCoverageLimit: 100_000,
    maxCoverageLimit: 10_000_000,
    maxAggregateExposure: 40_000_000,
    capacityByPeril: {
      lightning: 5_000_000,
      water_damage: 8_000_000,
      hail: 5_000_000,
    },
    minimumPremium: 5_000,
    targetProfitability: 18,
    expectedLossRatio: 55,
    minimumMargin: 12,
    minTargetYield: 0.14,
    scoreThresholdAccept: 80,
    scoreThresholdReview: 60,
    scoreThresholdDecline: 40,
    minDataQualityScore: 0.7,
    requiredFields: ['insuredName', 'locationAddress', 'tiv', 'revenue', 'perilType'],
    workflow: {
      allowAutoAccept: false,
      allowAutoDecline: true,
      allowAutoReferral: true,
      allowAutoQuote: false,
      allowAutoBind: false,
      manualReviewRequired: true,
    },
  },
];

/**
 * Project a blueprint into the createDefinition input: the editor section blocks
 * plus the authoritative appetite block. Keeping both in one place is what makes
 * the seeded definition match the UI 1:1 while still driving enforcement.
 */
function toDefinitionInput(bp: CapacityBlueprint, effective: Date, expires: Date): Record<string, unknown> {
  return {
    name: bp.name,
    code: bp.code,
    description: bp.description,
    status: 'approved',
    versionNumber: '1.0.0',
    effectiveDate: effective,
    expirationDate: expires,

    // ── Capacity quantity (spine) ──
    grossCapacity: bp.grossCapacity,
    netRetention: bp.netRetention,
    currency: CURRENCY,
    capacityPeriodBasis: bp.capacityPeriodBasis,

    // ── Organizational ownership (Section 2) ──
    // Line of business — derived from the primary allowed LOB so it always
    // matches the appetite rather than being set independently.
    lineOfBusiness: bp.allowedLinesOfBusiness[0],
    department: bp.department,
    team: bp.team,

    // ── Coverage (perils picked in the UI live here) ──
    coverageControls: {
      allowedCoverageTypes: bp.allowedPerils,
      excludedCoverageTypes: bp.excludedPerils,
      requiredClauses: bp.requiredClauses,
      requiredEndorsements: [],
    },

    // ── Risk eligibility (spec-block fallback the adapter also reads) ──
    riskEligibility: {
      eligibleRiskCategories: bp.allowedPerils,
      excludedRiskCategories: bp.excludedPerils,
      eligibleLinesOfBusiness: bp.allowedLinesOfBusiness,
    },

    // ── Geography ──
    geographicControls: {
      allowedTerritories: bp.allowedTerritories,
      excludedTerritories: bp.excludedTerritories,
    },

    // ── Exposure (UI keys + the enforcement keys the adapter reads as fallback) ──
    exposureConstraints: {
      maximumExposure: bp.maxAggregateExposure,
      maximumAggregateExposure: bp.maxAggregateExposure,
      maximumExposurePerRisk: bp.maxLineSize,
      limitKind: 'hard',
      maxLineSize: bp.maxLineSize,
      minCoverageLimit: bp.minCoverageLimit,
      maxCoverageLimit: bp.maxCoverageLimit,
    },

    // ── Pricing (mirrors the trimmed Pricing section) ──
    pricingControls: {
      minimumPremium: bp.minimumPremium,
      targetProfitability: bp.targetProfitability,
      expectedLossRatio: bp.expectedLossRatio,
      minimumMargin: bp.minimumMargin,
      minTargetYield: bp.minTargetYield,
    },

    // ── Scoring ──
    riskScoring: {
      scoreModel: 'default',
      scoreThresholdAccept: bp.scoreThresholdAccept,
      scoreThresholdReview: bp.scoreThresholdReview,
      scoreThresholdDecline: bp.scoreThresholdDecline,
      minDataQualityScore: bp.minDataQualityScore,
    },

    // ── Workflow ──
    workflowConfig: {
      ...bp.workflow,
      requiredFields: bp.requiredFields,
    },

    // ── Authoritative enforcement block (definitionToAppetiteProfile reads this) ──
    appetite: {
      preferredPerils: bp.allowedPerils,
      excludedPerils: bp.excludedPerils,
      allowedLinesOfBusiness: bp.allowedLinesOfBusiness,
      preferredJurisdictions: bp.allowedTerritories,
      excludedJurisdictions: bp.excludedTerritories,
      maxLineSize: bp.maxLineSize,
      minCoverageLimit: bp.minCoverageLimit,
      maxCoverageLimit: bp.maxCoverageLimit,
      capacityByPeril: bp.capacityByPeril,
      minTargetYield: bp.minTargetYield,
      minDataQualityScore: bp.minDataQualityScore,
      requiredFields: bp.requiredFields,
      currency: CURRENCY,
    },

    changeReason: 'Seeded by CapacityDefinitionSeedService for pipeline-adherence testing.',
  };
}

export type CapacityDefinitionSeedOptions = {
  /** Seed only this organization. Default: every organization. */
  organizationId?: number;
  /** Force a single blueprint by key for every org (otherwise round-robin). */
  archetype?: string;
  /** Refresh (update + reactivate) a definition that already carries the seed code. Default true. */
  overwrite?: boolean;
};

export type CapacityDefinitionSeedOutcome = {
  organizationId: number;
  organizationName: string;
  archetype: string;
  code: string;
  capacityDefinitionId: number | null;
  action: 'created' | 'updated' | 'skipped';
};

export type CapacityDefinitionSeedResult = {
  count: number;
  outcomes: CapacityDefinitionSeedOutcome[];
};

export class CapacityDefinitionSeedService {
  constructor(private readonly governance = new CapacityGovernanceService()) {}

  async seed(options: CapacityDefinitionSeedOptions = {}): Promise<CapacityDefinitionSeedResult> {
    const overwrite = options.overwrite ?? true;

    const forced = options.archetype
      ? BLUEPRINTS.find((b) => b.key === options.archetype) ?? null
      : null;
    if (options.archetype && !forced) {
      throw new Error(
        `unknown_archetype:${options.archetype}. Known: ${BLUEPRINTS.map((b) => b.key).join(', ')}`,
      );
    }

    const orgs = options.organizationId
      ? await Organization.findAll({ where: { id: options.organizationId } })
      : await Organization.findAll({ order: [['id', 'ASC']] });

    const effective = new Date();
    const expires = new Date(effective);
    expires.setFullYear(expires.getFullYear() + 1);

    const outcomes: CapacityDefinitionSeedOutcome[] = [];

    for (let i = 0; i < orgs.length; i++) {
      const org = orgs[i];
      const bp = forced ?? BLUEPRINTS[i % BLUEPRINTS.length];
      const input = toDefinitionInput(bp, effective, expires);

      const existing = await CapacityDefinition.findOne({
        where: { organizationId: org.id, code: bp.code },
      });

      if (existing && !overwrite) {
        outcomes.push({
          organizationId: org.id,
          organizationName: org.name,
          archetype: bp.key,
          code: bp.code,
          capacityDefinitionId: existing.id,
          action: 'skipped',
        });
        continue;
      }

      let defId: number;
      let action: 'created' | 'updated';

      if (existing) {
        await this.governance.updateDefinition(org.id, existing.id, input, null);
        defId = existing.id;
        action = 'updated';
      } else {
        const created = await this.governance.createDefinition(org.id, input, null);
        defId = created.id;
        action = 'created';
      }

      // Activate it as the org's single live definition (demotes any other
      // active definition and stamps approval metadata) so the validation
      // pipeline's loadAppetiteForTenant picks it up.
      await this.governance.transitionDefinition(
        org.id,
        defId,
        { status: 'active', deploymentStatus: 'active', changeReason: 'Activated by capacity seed.' },
        null,
      );

      outcomes.push({
        organizationId: org.id,
        organizationName: org.name,
        archetype: bp.key,
        code: bp.code,
        capacityDefinitionId: defId,
        action,
      });
    }

    return { count: outcomes.length, outcomes };
  }
}
