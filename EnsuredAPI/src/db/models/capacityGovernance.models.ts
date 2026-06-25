import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';
import type { RuleAction } from '../../pipeline/validation/ruleEngine';

/**
 * Capacity Governance models — the structured backing for the Governance module
 * (Capacity Configuration Form spec).
 *
 * The spec describes a product-agnostic system for defining underwriting
 * capacity, appetite, authority, controls and workflow in a format a rules
 * engine can consume. Rather than a column per spec field (which would force a
 * schema change for every new line of business), the spine `CapacityDefinition`
 * keeps the stable Section 1/2/17/19 fields as real columns and carries each
 * control *domain* (geography, eligibility, exposure, portfolio, accumulation,
 * pricing, coverage, distribution, scoring, workflow) as a typed JSONB block.
 *
 * The multiplicity-heavy sections — authority levels, referral rules,
 * rules-engine rule sets, simulations and the audit trail — are their own child
 * tables so they can be listed, ordered and queried independently.
 *
 * Note: an unrelated `governance.models.ts` already owns the KYC/claims/ledger
 * domain and the `initGovernanceModels` name, so this module is deliberately
 * `capacityGovernance` / `initCapacityGovernanceModels`.
 */

/** A nested rules-engine condition node (Section 15). */
export type RuleConditionNode = {
  /** Boolean connector for a group node. */
  connector?: 'AND' | 'OR' | 'NOT';
  /** Child nodes when this is a group. */
  conditions?: RuleConditionNode[];
  /** Left-hand operand (a field key) when this is a leaf. */
  field?: string;
  /** Comparison operator when this is a leaf. */
  operator?: string;
  /** Right-hand operand when this is a leaf. */
  value?: unknown;
};

export class CapacityDefinition extends Model<
  InferAttributes<CapacityDefinition>,
  InferCreationAttributes<CapacityDefinition>
> {
  declare id: CreationOptional<number>;
  declare organizationId: number;

  // ── Section 1: Capacity Information ──
  declare name: string;
  declare code: CreationOptional<string | null>;
  declare description: CreationOptional<string | null>;
  declare status: CreationOptional<string>;
  declare effectiveDate: CreationOptional<Date | null>;
  declare expirationDate: CreationOptional<Date | null>;
  declare versionNumber: CreationOptional<string>;

  // ── Capacity quantity: the total capacity this definition deploys, and the
  // currency / period everything underneath it is denominated and reset in. This
  // is the denominator for "how much room is left?" — the per-location aggregate
  // limits and the utilization ledger roll up against it. All nullable so a
  // definition can still be appetite-only with no committed capacity number. ──
  declare grossCapacity: CreationOptional<string | null>; // total written limit deployable
  declare netRetention: CreationOptional<string | null>; // retained net of (future) reinsurance
  declare currency: CreationOptional<string>; // base currency for the spine
  declare capacityPeriodBasis: CreationOptional<string | null>; // annual | treaty_year | underwriting_year | policy_year

  // ── Section 19: Deployment lifecycle ──
  declare deploymentStatus: CreationOptional<string>;
  declare isActive: CreationOptional<boolean>;
  /** Lineage: the definition this one was cloned from (null for originals). */
  declare clonedFromId: CreationOptional<number | null>;

  // ── Section 2: Organizational Ownership ──
  /** Line of business this capacity is written for. */
  declare lineOfBusiness: CreationOptional<string | null>;
  declare department: CreationOptional<string | null>;
  declare team: CreationOptional<string | null>;
  declare ownerUserId: CreationOptional<number | null>;
  declare backupOwnerUserId: CreationOptional<number | null>;
  declare riskManagerUserId: CreationOptional<number | null>;
  declare approvalCommittee: CreationOptional<number[]>;

  // ── Sections 3–13: control domains carried as typed JSONB blocks ──
  declare geographicControls: CreationOptional<Record<string, unknown>>; // S3
  declare riskEligibility: CreationOptional<Record<string, unknown>>; // S4
  declare exposureConstraints: CreationOptional<Record<string, unknown>>; // S5
  declare portfolioControls: CreationOptional<Record<string, unknown>>; // S6
  declare accumulationControls: CreationOptional<Record<string, unknown>>; // S7
  declare pricingControls: CreationOptional<Record<string, unknown>>; // S8
  declare coverageControls: CreationOptional<Record<string, unknown>>; // S9
  declare distributionControls: CreationOptional<Record<string, unknown>>; // S10
  declare riskScoring: CreationOptional<Record<string, unknown>>; // S12
  declare workflowConfig: CreationOptional<Record<string, unknown>>; // S13

  // Enforcement-facing appetite block. Projected into the validation pipeline's
  // AppetiteProfileLike by definitionToAppetiteProfile (perils, jurisdictions,
  // capacityByPeril, line/coverage limits, minTargetYield, minDataQualityScore,
  // requiredFields, allowedLinesOfBusiness, currency).
  declare appetite: CreationOptional<Record<string, unknown>>;

  // ── Section 17: Audit & Governance ──
  declare createdByUserId: CreationOptional<number | null>;
  declare lastModifiedByUserId: CreationOptional<number | null>;
  declare approvedByUserId: CreationOptional<number | null>;
  declare approvalDate: CreationOptional<Date | null>;
  declare changeReason: CreationOptional<string | null>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

/** Section 11: a single underwriting authority level (a definition has many). */
export class CapacityAuthorityLevel extends Model<
  InferAttributes<CapacityAuthorityLevel>,
  InferCreationAttributes<CapacityAuthorityLevel>
> {
  declare id: CreationOptional<number>;
  declare capacityDefinitionId: number;
  declare organizationId: number;
  declare name: string;
  declare maxPremiumAuthority: CreationOptional<string | null>;
  declare maxExposureAuthority: CreationOptional<string | null>;
  declare maxPricingDeviation: CreationOptional<string | null>;
  declare maxDiscountAuthority: CreationOptional<string | null>;
  declare maxCreditAuthority: CreationOptional<string | null>;
  declare referralThreshold: CreationOptional<string | null>;
  declare sortOrder: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

/** Section 14: an escalation/referral rule (a definition has many). */
export class CapacityReferralRule extends Model<
  InferAttributes<CapacityReferralRule>,
  InferCreationAttributes<CapacityReferralRule>
> {
  declare id: CreationOptional<number>;
  declare capacityDefinitionId: number;
  declare organizationId: number;
  declare name: string;
  declare description: CreationOptional<string | null>;
  declare severity: CreationOptional<string>;
  declare triggerConditions: CreationOptional<RuleConditionNode | Record<string, unknown>>;
  declare referralDestinationType: CreationOptional<string | null>;
  declare referralDestinationId: CreationOptional<string | null>;
  declare activeFlag: CreationOptional<boolean>;
  declare sortOrder: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

/** Section 15: a rules-engine rule set with a nested condition tree. */
export class CapacityRuleSet extends Model<
  InferAttributes<CapacityRuleSet>,
  InferCreationAttributes<CapacityRuleSet>
> {
  declare id: CreationOptional<number>;
  declare capacityDefinitionId: number;
  declare organizationId: number;
  declare name: string;
  declare description: CreationOptional<string | null>;
  declare rootCondition: CreationOptional<RuleConditionNode>;
  /** Catalog model key the rule runs on (e.g. `submission`). */
  declare subjectModel: CreationOptional<string | null>;
  /** Structured outcome actions (calculate / set / create / update / delete / decision). */
  declare actions: CreationOptional<RuleAction[]>;
  /** @deprecated legacy single decision label — superseded by `actions`. */
  declare outcome: CreationOptional<string | null>;
  declare enabled: CreationOptional<boolean>;
  declare sortOrder: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

/** Section 18: a simulation / what-if / replay run. */
export class CapacitySimulation extends Model<
  InferAttributes<CapacitySimulation>,
  InferCreationAttributes<CapacitySimulation>
> {
  declare id: CreationOptional<number>;
  declare capacityDefinitionId: CreationOptional<number | null>;
  declare organizationId: number;
  declare name: string;
  declare simulationType: string;
  declare inputParams: CreationOptional<Record<string, unknown>>;
  declare results: CreationOptional<Record<string, unknown> | null>;
  declare status: CreationOptional<string>;
  declare ranByUserId: CreationOptional<number | null>;
  declare ranAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

/** Section 17: an immutable audit-trail entry capturing a full snapshot. */
export class CapacityAuditEntry extends Model<
  InferAttributes<CapacityAuditEntry>,
  InferCreationAttributes<CapacityAuditEntry>
> {
  declare id: CreationOptional<number>;
  declare capacityDefinitionId: number;
  declare organizationId: number;
  declare action: string;
  declare versionNumber: CreationOptional<string | null>;
  declare changeReason: CreationOptional<string | null>;
  declare snapshot: CreationOptional<Record<string, unknown>>;
  declare changedByUserId: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
}

/**
 * Stored utilization ledger (Q6): one row per exposure committed against a
 * capacity definition. Where `locationUtilizationService` *computes* deployed
 * exposure on the fly from in-force policies, this table *records* it as the
 * capacity is consumed — giving a point-in-time, auditable "remaining capacity"
 * that does not depend on re-deriving from policies. Active rows
 * (status bound|in_flight) sum to deployed; releasing/expiring a commitment
 * keeps the row for history but drops it out of the deployed total.
 */
export class CapacityUtilizationEntry extends Model<
  InferAttributes<CapacityUtilizationEntry>,
  InferCreationAttributes<CapacityUtilizationEntry>
> {
  declare id: CreationOptional<number>;
  declare capacityDefinitionId: number;
  declare organizationId: number;
  /** Line of business this exposure consumes, or `'*'` for all-lines. */
  declare lineOfBusinessCode: CreationOptional<string>;
  /** Optional jurisdiction the exposure sits in (mirrors location-limit encoding). */
  declare entry: CreationOptional<string | null>;
  declare level: CreationOptional<string | null>; // country | state | city
  declare countryId: CreationOptional<number | null>;
  declare stateProvinceId: CreationOptional<number | null>;
  declare cityId: CreationOptional<number | null>;
  /** What consumed the capacity, e.g. 'policy' | 'quote' | 'submission'. */
  declare subjectType: string;
  declare subjectId: number;
  /** Committed exposure ($) — the line/limit deployed. */
  declare exposureAmount: string;
  /** Premium booked against it, when known. */
  declare premiumAmount: CreationOptional<string | null>;
  declare currency: CreationOptional<string>;
  /** bound | in_flight | released | expired. Only bound/in_flight count as deployed. */
  declare status: CreationOptional<string>;
  declare effectiveFrom: CreationOptional<string | null>;
  declare effectiveTo: CreationOptional<string | null>;
  declare recordedByUserId: CreationOptional<number | null>;
  declare releasedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initCapacityGovernanceModels(sequelize: Sequelize): void {
  CapacityDefinition.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      organizationId: { type: DataTypes.INTEGER, allowNull: false },

      name: { type: DataTypes.STRING, allowNull: false },
      code: { type: DataTypes.STRING, allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'draft' },
      effectiveDate: { type: DataTypes.DATE, allowNull: true },
      expirationDate: { type: DataTypes.DATE, allowNull: true },
      versionNumber: { type: DataTypes.STRING, allowNull: false, defaultValue: '1.0.0' },

      grossCapacity: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      netRetention: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'USD' },
      capacityPeriodBasis: { type: DataTypes.STRING, allowNull: true },

      deploymentStatus: { type: DataTypes.STRING, allowNull: false, defaultValue: 'draft' },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      clonedFromId: { type: DataTypes.INTEGER, allowNull: true },

      lineOfBusiness: { type: DataTypes.STRING, allowNull: true },
      department: { type: DataTypes.STRING, allowNull: true },
      team: { type: DataTypes.STRING, allowNull: true },
      ownerUserId: { type: DataTypes.INTEGER, allowNull: true },
      backupOwnerUserId: { type: DataTypes.INTEGER, allowNull: true },
      riskManagerUserId: { type: DataTypes.INTEGER, allowNull: true },
      approvalCommittee: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },

      geographicControls: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      riskEligibility: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      exposureConstraints: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      portfolioControls: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      accumulationControls: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      pricingControls: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      coverageControls: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      distributionControls: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      riskScoring: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      workflowConfig: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      appetite: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },

      createdByUserId: { type: DataTypes.INTEGER, allowNull: true },
      lastModifiedByUserId: { type: DataTypes.INTEGER, allowNull: true },
      approvedByUserId: { type: DataTypes.INTEGER, allowNull: true },
      approvalDate: { type: DataTypes.DATE, allowNull: true },
      changeReason: { type: DataTypes.TEXT, allowNull: true },

      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'CapacityDefinition',
      tableName: 'capacityDefinitions',
      indexes: [
        { fields: ['organizationId'], name: 'idx_capacity_defs_org' },
        { unique: true, fields: ['organizationId', 'code'], name: 'uq_capacity_defs_org_code' },
        { fields: ['organizationId', 'status'], name: 'idx_capacity_defs_status' },
      ],
    },
  );

  CapacityAuthorityLevel.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      capacityDefinitionId: { type: DataTypes.INTEGER, allowNull: false },
      organizationId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      maxPremiumAuthority: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      maxExposureAuthority: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      maxPricingDeviation: { type: DataTypes.DECIMAL(9, 4), allowNull: true },
      maxDiscountAuthority: { type: DataTypes.DECIMAL(9, 4), allowNull: true },
      maxCreditAuthority: { type: DataTypes.DECIMAL(9, 4), allowNull: true },
      referralThreshold: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'CapacityAuthorityLevel',
      tableName: 'capacityAuthorityLevels',
      indexes: [
        { fields: ['capacityDefinitionId'], name: 'idx_capacity_authority_def' },
        { fields: ['organizationId'], name: 'idx_capacity_authority_org' },
        { fields: ['capacityDefinitionId', 'sortOrder'], name: 'idx_capacity_authority_order' },
      ],
    },
  );

  CapacityReferralRule.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      capacityDefinitionId: { type: DataTypes.INTEGER, allowNull: false },
      organizationId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      severity: { type: DataTypes.STRING, allowNull: false, defaultValue: 'medium' },
      triggerConditions: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      referralDestinationType: { type: DataTypes.STRING, allowNull: true },
      referralDestinationId: { type: DataTypes.STRING, allowNull: true },
      activeFlag: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'CapacityReferralRule',
      tableName: 'capacityReferralRules',
      indexes: [
        { fields: ['capacityDefinitionId'], name: 'idx_capacity_referral_def' },
        { fields: ['organizationId'], name: 'idx_capacity_referral_org' },
        { fields: ['capacityDefinitionId', 'sortOrder'], name: 'idx_capacity_referral_order' },
      ],
    },
  );

  CapacityRuleSet.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      capacityDefinitionId: { type: DataTypes.INTEGER, allowNull: false },
      organizationId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      rootCondition: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: { connector: 'AND', conditions: [] },
      },
      subjectModel: { type: DataTypes.STRING, allowNull: true },
      actions: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      outcome: { type: DataTypes.STRING, allowNull: true },
      enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'CapacityRuleSet',
      tableName: 'capacityRuleSets',
      indexes: [
        { fields: ['capacityDefinitionId'], name: 'idx_capacity_ruleset_def' },
        { fields: ['organizationId'], name: 'idx_capacity_ruleset_org' },
        { fields: ['capacityDefinitionId', 'sortOrder'], name: 'idx_capacity_ruleset_order' },
      ],
    },
  );

  CapacitySimulation.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      capacityDefinitionId: { type: DataTypes.INTEGER, allowNull: true },
      organizationId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      simulationType: { type: DataTypes.STRING, allowNull: false },
      inputParams: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      results: { type: DataTypes.JSONB, allowNull: true },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
      ranByUserId: { type: DataTypes.INTEGER, allowNull: true },
      ranAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'CapacitySimulation',
      tableName: 'capacitySimulations',
      indexes: [
        { fields: ['organizationId'], name: 'idx_capacity_sim_org' },
        { fields: ['capacityDefinitionId'], name: 'idx_capacity_sim_def' },
      ],
    },
  );

  CapacityAuditEntry.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      capacityDefinitionId: { type: DataTypes.INTEGER, allowNull: false },
      organizationId: { type: DataTypes.INTEGER, allowNull: false },
      action: { type: DataTypes.STRING, allowNull: false },
      versionNumber: { type: DataTypes.STRING, allowNull: true },
      changeReason: { type: DataTypes.TEXT, allowNull: true },
      snapshot: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      changedByUserId: { type: DataTypes.INTEGER, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'CapacityAuditEntry',
      tableName: 'capacityAuditEntries',
      timestamps: true,
      updatedAt: false,
      indexes: [
        { fields: ['capacityDefinitionId'], name: 'idx_capacity_audit_def' },
        { fields: ['organizationId'], name: 'idx_capacity_audit_org' },
      ],
    },
  );

  CapacityUtilizationEntry.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      capacityDefinitionId: { type: DataTypes.INTEGER, allowNull: false },
      organizationId: { type: DataTypes.INTEGER, allowNull: false },
      lineOfBusinessCode: { type: DataTypes.STRING, allowNull: false, defaultValue: '*' },
      entry: { type: DataTypes.STRING, allowNull: true },
      level: { type: DataTypes.STRING, allowNull: true },
      countryId: { type: DataTypes.INTEGER, allowNull: true },
      stateProvinceId: { type: DataTypes.INTEGER, allowNull: true },
      cityId: { type: DataTypes.INTEGER, allowNull: true },
      subjectType: { type: DataTypes.STRING, allowNull: false },
      subjectId: { type: DataTypes.INTEGER, allowNull: false },
      exposureAmount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      premiumAmount: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'USD' },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'bound' },
      effectiveFrom: { type: DataTypes.DATEONLY, allowNull: true },
      effectiveTo: { type: DataTypes.DATEONLY, allowNull: true },
      recordedByUserId: { type: DataTypes.INTEGER, allowNull: true },
      releasedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'CapacityUtilizationEntry',
      tableName: 'capacityUtilizationEntries',
      indexes: [
        { fields: ['organizationId'], name: 'idx_capacity_util_org' },
        { fields: ['capacityDefinitionId'], name: 'idx_capacity_util_def' },
        { fields: ['capacityDefinitionId', 'status'], name: 'idx_capacity_util_def_status' },
        {
          unique: true,
          fields: ['capacityDefinitionId', 'subjectType', 'subjectId'],
          name: 'uq_capacity_util_def_subject',
        },
      ],
    },
  );
}
