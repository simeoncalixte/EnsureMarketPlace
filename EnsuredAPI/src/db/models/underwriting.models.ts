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
  policyTypes,
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
  declare tenantId: number | null;
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
      tenantId: { type: DataTypes.INTEGER, allowNull: true, field: 'tenant_id' },
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
}
