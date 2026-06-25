import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';
import {
  assetTypes,
  constructionTypes,
  occupancyTypes,
  perilCodes,
  policyChangeTypes,
  policyStatuses,
  policyTypes,
  quoteStatuses,
} from './constants';

export class RiskPortfolio extends Model<InferAttributes<RiskPortfolio>, InferCreationAttributes<RiskPortfolio>> {
  declare id: CreationOptional<number>;
  declare insurerProfileId: number;
  declare name: string;
  declare region: string;
  declare perilType: string;
  declare totalExposure: string;
  declare currency: string;
  declare totalPremium: string | null;
  declare expectedLoss: string | null;
  declare var95: string | null;
  declare var99: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Policy extends Model<InferAttributes<Policy>, InferCreationAttributes<Policy>> {
  declare id: CreationOptional<number>;
  declare externalPolicyId: string;
  declare insurerProfileId: number;
  declare portfolioId: number | null;
  declare submissionId: number | null;
  // Close-the-loop: a bound policy traces back to the QuoteVersion it was bound
  // from. Nullable so legacy/seeded policies (no quote) are unaffected.
  declare sourceQuoteId: CreationOptional<number | null>;
  // Lifecycle state of the in-force policy (mirrors the latest PolicyVersion).
  declare status: CreationOptional<(typeof policyStatuses)[number] | null>;
  // Pointer to the current immutable PolicyVersion (cf. Pricing.currentVersionNumber).
  declare currentVersionNumber: CreationOptional<number | null>;
  declare policyType: (typeof policyTypes)[number];
  declare effectiveDate: Date;
  declare expirationDate: Date;
  declare premium: string;
  declare insuredValue: string;
  declare deductible: string | null;
  declare coverageLimit: string | null;
  declare latitude: number | null;
  declare longitude: number | null;
  declare region: string | null;
  declare perilCoverage: string[] | null;
  declare lineOfBusinessCode: CreationOptional<string | null>;
  declare underwritingScore: string | null;
  declare currency: string | null;
  declare normalizedCurrency: string | null;
  declare normalizationRate: string | null;
  declare normalizationAt: Date | null;
  declare addressId: CreationOptional<number | null>;
  declare countryId: CreationOptional<number | null>;
  declare stateProvinceId: CreationOptional<number | null>;
  declare cityId: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class ExposureUnit extends Model<InferAttributes<ExposureUnit>, InferCreationAttributes<ExposureUnit>> {
  declare id: CreationOptional<number>;
  declare exposureRef: string;
  declare policyId: number;
  declare subjectLabel: string | null;
  declare subjectIndex: number | null;
  declare assetType: (typeof assetTypes)[number];
  declare constructionType: (typeof constructionTypes)[number] | null;
  declare occupancyType: (typeof occupancyTypes)[number] | null;
  declare replacementCost: string | null;
  declare latitude: number | null;
  declare longitude: number | null;
  declare vulnerabilityScore: string | null;
  declare addressId: CreationOptional<number | null>;
  declare cityId: CreationOptional<number | null>;
  declare countryId: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Submission extends Model<InferAttributes<Submission>, InferCreationAttributes<Submission>> {
  declare id: CreationOptional<number>;
  declare insurerProfileId: number | null;
  declare portfolioId: number | null;
  declare submittedByUserId: number | null;
  declare status: string;
  declare organizationId: number | null;
  declare source: string | null;
  declare transport: string | null;
  declare receivedAt: Date | null;
  declare ingestionChannelId: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class ModelRun extends Model<InferAttributes<ModelRun>, InferCreationAttributes<ModelRun>> {
  declare id: CreationOptional<number>;
  declare submissionId: number;
  declare modelVersion: string;
  declare parametersJson: Record<string, unknown> | null;
  declare expectedLoss: string | null;
  declare var99: string | null;
  declare outputJson: Record<string, unknown> | null;
  declare executedByUserId: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Pricing extends Model<InferAttributes<Pricing>, InferCreationAttributes<Pricing>> {
  declare id: CreationOptional<number>;
  declare submissionId: number;
  declare currentVersionNumber: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class PricingVersion extends Model<InferAttributes<PricingVersion>, InferCreationAttributes<PricingVersion>> {
  declare id: CreationOptional<number>;
  declare pricingId: number;
  declare versionNumber: number;
  declare assumptionsJson: Record<string, unknown> | null;
  declare premium: string;
  declare expectedReturn: string | null;
  declare riskScore: string | null;
  declare createdByUserId: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class RiskMetric extends Model<InferAttributes<RiskMetric>, InferCreationAttributes<RiskMetric>> {
  declare id: CreationOptional<number>;
  declare dealId: number;
  declare metricType: string;
  declare value: string;
  declare sourceModelRunId: number | null;
  declare calculatedAt: Date;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

/**
 * Quote header — one per submission (cf. `Pricing`). Holds the quote identity, the
 * denormalized current lifecycle status (for fast board filtering), a pointer to
 * the current version, and the bound-policy link once the offer is bound.
 */
export class Quote extends Model<InferAttributes<Quote>, InferCreationAttributes<Quote>> {
  declare id: CreationOptional<number>;
  declare submissionId: number;
  declare organizationId: number | null;
  declare insurerProfileId: number | null;
  declare quoteNumber: string;
  declare status: CreationOptional<(typeof quoteStatuses)[number]>;
  declare currentVersionNumber: CreationOptional<number | null>;
  declare boundPolicyId: CreationOptional<number | null>;
  declare createdByUserId: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

/**
 * An immutable revision of a quote (cf. `PricingVersion`). Each issue/re-quote
 * appends a new version; the accepted/bound version is pinned forever. It snapshots
 * the offered economics + terms and references the exact `PricingVersion` it was
 * built on, so a bound policy traces Policy → QuoteVersion → PricingVersion →
 * ModelRun → CanonicalSubmission.
 */
export class QuoteVersion extends Model<InferAttributes<QuoteVersion>, InferCreationAttributes<QuoteVersion>> {
  declare id: CreationOptional<number>;
  declare quoteId: number;
  declare versionNumber: number;
  declare pricingVersionId: number | null;
  declare status: CreationOptional<(typeof quoteStatuses)[number]>;
  // offered economics (a snapshot — quoted premium may load on top of technical premium)
  declare premium: string;
  declare currency: CreationOptional<string | null>;
  declare commissionRate: string | null;
  // offered structure / terms
  declare coverageLimit: string | null;
  declare attachmentPoint: string | null;
  declare deductible: string | null;
  declare effectiveDate: Date | null;
  declare expirationDate: Date | null;
  declare termsJson: CreationOptional<Record<string, unknown> | null>;
  // offer lifecycle
  declare validUntil: Date | null;
  declare documentRef: string | null;
  declare issuedAt: Date | null;
  declare issuedByUserId: number | null;
  declare decisionAt: Date | null;
  declare decisionByUserId: number | null;
  declare decisionReason: string | null;
  declare createdByUserId: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

/**
 * An immutable version of a policy (cf. `PricingVersion`/`QuoteVersion`). Version 1
 * is the `issuance` (bound from a QuoteVersion); later versions are endorsements /
 * cancellations / renewals. The `Policy` row carries the current denormalized
 * snapshot; this table is the auditable history of every term change.
 */
export class PolicyVersion extends Model<InferAttributes<PolicyVersion>, InferCreationAttributes<PolicyVersion>> {
  declare id: CreationOptional<number>;
  declare policyId: number;
  declare versionNumber: number;
  declare changeType: (typeof policyChangeTypes)[number];
  declare status: (typeof policyStatuses)[number];
  declare sourceQuoteVersionId: number | null;
  declare premium: string;
  declare coverageLimit: string | null;
  declare deductible: string | null;
  declare effectiveDate: Date;
  declare expirationDate: Date;
  // When this version's terms take effect (endorsement effective date). For the
  // issuance this equals the policy effectiveDate.
  declare effectiveFrom: Date | null;
  declare termsJson: CreationOptional<Record<string, unknown> | null>;
  declare reason: string | null;
  declare createdByUserId: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initUnderwritingModels(sequelize: Sequelize): void {
  RiskPortfolio.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      insurerProfileId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      region: { type: DataTypes.STRING, allowNull: false },
      perilType: { type: DataTypes.STRING, allowNull: false, validate: { isIn: [perilCodes] } },
      totalExposure: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      totalPremium: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      expectedLoss: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
      var95: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
      var99: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'RiskPortfolio', tableName: 'riskPortfolios' },
  );

  Policy.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      externalPolicyId: { type: DataTypes.STRING, allowNull: false, unique: true },
      insurerProfileId: { type: DataTypes.INTEGER, allowNull: false },
      portfolioId: { type: DataTypes.INTEGER, allowNull: true },
      submissionId: { type: DataTypes.INTEGER, allowNull: true },
      sourceQuoteId: { type: DataTypes.INTEGER, allowNull: true },
      status: { type: DataTypes.STRING, allowNull: true, validate: { isIn: [policyStatuses] } },
      currentVersionNumber: { type: DataTypes.INTEGER, allowNull: true },
      policyType: { type: DataTypes.STRING, allowNull: false, validate: { isIn: [policyTypes] } },
      effectiveDate: { type: DataTypes.DATEONLY, allowNull: false },
      expirationDate: { type: DataTypes.DATEONLY, allowNull: false },
      premium: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      insuredValue: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      deductible: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      coverageLimit: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      latitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
      longitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
      region: { type: DataTypes.STRING, allowNull: true },
      perilCoverage: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
      lineOfBusinessCode: { type: DataTypes.STRING, allowNull: true },
      underwritingScore: { type: DataTypes.DECIMAL(6, 4), allowNull: true },
      currency: { type: DataTypes.STRING(3), allowNull: true },
      normalizedCurrency: { type: DataTypes.STRING(3), allowNull: true },
      normalizationRate: { type: DataTypes.DECIMAL(24, 12), allowNull: true },
      normalizationAt: { type: DataTypes.DATE, allowNull: true },
      addressId: { type: DataTypes.INTEGER, allowNull: true },
      countryId: { type: DataTypes.INTEGER, allowNull: true },
      stateProvinceId: { type: DataTypes.INTEGER, allowNull: true },
      cityId: { type: DataTypes.INTEGER, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'Policy',
      tableName: 'policies',
      indexes: [
        { fields: ['insurerProfileId'] },
        { fields: ['portfolioId'] },
        { fields: ['submissionId'] },
      ],
    },
  );

  ExposureUnit.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      exposureRef: { type: DataTypes.STRING, allowNull: false, unique: true },
      policyId: { type: DataTypes.INTEGER, allowNull: false },
      subjectLabel: { type: DataTypes.STRING, allowNull: true },
      subjectIndex: { type: DataTypes.INTEGER, allowNull: true },
      assetType: { type: DataTypes.STRING, allowNull: false, validate: { isIn: [assetTypes] } },
      constructionType: { type: DataTypes.STRING, allowNull: true, validate: { isIn: [constructionTypes] } },
      occupancyType: { type: DataTypes.STRING, allowNull: true, validate: { isIn: [occupancyTypes] } },
      replacementCost: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      latitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
      longitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
      vulnerabilityScore: { type: DataTypes.DECIMAL(6, 4), allowNull: true },
      addressId: { type: DataTypes.INTEGER, allowNull: true },
      cityId: { type: DataTypes.INTEGER, allowNull: true },
      countryId: { type: DataTypes.INTEGER, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'ExposureUnit',
      tableName: 'exposureUnits',
      indexes: [{ fields: ['policyId'] }],
    },
  );

  Submission.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      insurerProfileId: { type: DataTypes.INTEGER, allowNull: true, field: 'insurer_profile_id' },
      portfolioId: { type: DataTypes.INTEGER, allowNull: true, field: 'portfolio_id' },
      submittedByUserId: { type: DataTypes.INTEGER, allowNull: true, field: 'submitted_by_user_id' },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'draft',
        validate: { notEmpty: true },
      },
      organizationId: { type: DataTypes.INTEGER, allowNull: true, field: 'organization_id' },
      source: { type: DataTypes.STRING, allowNull: true },
      transport: { type: DataTypes.STRING, allowNull: true },
      receivedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW, field: 'received_at' },
      ingestionChannelId: { type: DataTypes.INTEGER, allowNull: true, field: 'ingestion_channel_id' },
      createdAt: { type: DataTypes.DATE, allowNull: true, field: 'created_at' },
      updatedAt: { type: DataTypes.DATE, allowNull: true, field: 'updated_at' },
    },
    { sequelize, modelName: 'Submission', tableName: 'submissions', underscored: true },
  );

  ModelRun.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      submissionId: { type: DataTypes.INTEGER, allowNull: false },
      modelVersion: { type: DataTypes.STRING, allowNull: false },
      parametersJson: { type: DataTypes.JSONB, allowNull: true },
      expectedLoss: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
      var99: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
      outputJson: { type: DataTypes.JSONB, allowNull: true },
      executedByUserId: { type: DataTypes.INTEGER, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'ModelRun', tableName: 'modelRuns' },
  );

  Pricing.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      submissionId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      currentVersionNumber: { type: DataTypes.INTEGER, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'Pricing', tableName: 'pricings' },
  );

  PricingVersion.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      pricingId: { type: DataTypes.INTEGER, allowNull: false },
      versionNumber: { type: DataTypes.INTEGER, allowNull: false },
      assumptionsJson: { type: DataTypes.JSONB, allowNull: true },
      premium: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      expectedReturn: { type: DataTypes.DECIMAL(10, 4), allowNull: true },
      riskScore: { type: DataTypes.DECIMAL(10, 4), allowNull: true },
      createdByUserId: { type: DataTypes.INTEGER, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'PricingVersion',
      tableName: 'pricingVersions',
      indexes: [{ unique: true, fields: ['pricingId', 'versionNumber'] }],
    },
  );

  RiskMetric.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      dealId: { type: DataTypes.INTEGER, allowNull: false },
      metricType: { type: DataTypes.STRING, allowNull: false },
      value: { type: DataTypes.DECIMAL(18, 6), allowNull: false },
      sourceModelRunId: { type: DataTypes.INTEGER, allowNull: true },
      calculatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'RiskMetric', tableName: 'riskMetrics' },
  );

  Quote.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      submissionId: { type: DataTypes.INTEGER, allowNull: false, unique: true, field: 'submission_id' },
      organizationId: { type: DataTypes.INTEGER, allowNull: true, field: 'organization_id' },
      insurerProfileId: { type: DataTypes.INTEGER, allowNull: true, field: 'insurer_profile_id' },
      quoteNumber: { type: DataTypes.STRING, allowNull: false, unique: true, field: 'quote_number' },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'issued', validate: { isIn: [quoteStatuses] } },
      currentVersionNumber: { type: DataTypes.INTEGER, allowNull: true, field: 'current_version_number' },
      boundPolicyId: { type: DataTypes.INTEGER, allowNull: true, field: 'bound_policy_id' },
      createdByUserId: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by_user_id' },
      createdAt: { type: DataTypes.DATE, allowNull: true, field: 'created_at' },
      updatedAt: { type: DataTypes.DATE, allowNull: true, field: 'updated_at' },
    },
    {
      sequelize,
      modelName: 'Quote',
      tableName: 'quotes',
      underscored: true,
      indexes: [{ fields: ['submission_id'] }],
    },
  );

  QuoteVersion.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      quoteId: { type: DataTypes.INTEGER, allowNull: false, field: 'quote_id' },
      versionNumber: { type: DataTypes.INTEGER, allowNull: false, field: 'version_number' },
      pricingVersionId: { type: DataTypes.INTEGER, allowNull: true, field: 'pricing_version_id' },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'issued', validate: { isIn: [quoteStatuses] } },
      premium: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      currency: { type: DataTypes.STRING(3), allowNull: true, defaultValue: 'USD' },
      commissionRate: { type: DataTypes.DECIMAL(10, 4), allowNull: true, field: 'commission_rate' },
      coverageLimit: { type: DataTypes.DECIMAL(18, 2), allowNull: true, field: 'coverage_limit' },
      attachmentPoint: { type: DataTypes.DECIMAL(18, 2), allowNull: true, field: 'attachment_point' },
      deductible: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      effectiveDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'effective_date' },
      expirationDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'expiration_date' },
      termsJson: { type: DataTypes.JSONB, allowNull: true, field: 'terms_json' },
      validUntil: { type: DataTypes.DATE, allowNull: true, field: 'valid_until' },
      documentRef: { type: DataTypes.STRING, allowNull: true, field: 'document_ref' },
      issuedAt: { type: DataTypes.DATE, allowNull: true, field: 'issued_at' },
      issuedByUserId: { type: DataTypes.INTEGER, allowNull: true, field: 'issued_by_user_id' },
      decisionAt: { type: DataTypes.DATE, allowNull: true, field: 'decision_at' },
      decisionByUserId: { type: DataTypes.INTEGER, allowNull: true, field: 'decision_by_user_id' },
      decisionReason: { type: DataTypes.STRING, allowNull: true, field: 'decision_reason' },
      createdByUserId: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by_user_id' },
      createdAt: { type: DataTypes.DATE, allowNull: true, field: 'created_at' },
      updatedAt: { type: DataTypes.DATE, allowNull: true, field: 'updated_at' },
    },
    {
      sequelize,
      modelName: 'QuoteVersion',
      tableName: 'quote_versions',
      underscored: true,
      indexes: [{ unique: true, fields: ['quote_id', 'version_number'] }],
    },
  );

  PolicyVersion.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      policyId: { type: DataTypes.INTEGER, allowNull: false, field: 'policy_id' },
      versionNumber: { type: DataTypes.INTEGER, allowNull: false, field: 'version_number' },
      changeType: { type: DataTypes.STRING, allowNull: false, field: 'change_type', validate: { isIn: [policyChangeTypes] } },
      status: { type: DataTypes.STRING, allowNull: false, validate: { isIn: [policyStatuses] } },
      sourceQuoteVersionId: { type: DataTypes.INTEGER, allowNull: true, field: 'source_quote_version_id' },
      premium: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      coverageLimit: { type: DataTypes.DECIMAL(18, 2), allowNull: true, field: 'coverage_limit' },
      deductible: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      effectiveDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'effective_date' },
      expirationDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'expiration_date' },
      effectiveFrom: { type: DataTypes.DATEONLY, allowNull: true, field: 'effective_from' },
      termsJson: { type: DataTypes.JSONB, allowNull: true, field: 'terms_json' },
      reason: { type: DataTypes.STRING, allowNull: true },
      createdByUserId: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by_user_id' },
      createdAt: { type: DataTypes.DATE, allowNull: true, field: 'created_at' },
      updatedAt: { type: DataTypes.DATE, allowNull: true, field: 'updated_at' },
    },
    {
      sequelize,
      modelName: 'PolicyVersion',
      tableName: 'policy_versions',
      underscored: true,
      indexes: [{ unique: true, fields: ['policy_id', 'version_number'] }],
    },
  );
}
