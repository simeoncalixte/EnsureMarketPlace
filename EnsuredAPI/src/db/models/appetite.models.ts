import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

/**
 * Organization-level underwriting & investment appetite. One default profile
 * per organization captures the structured limits an org uses to decide which
 * submissions it will write (perils, capacity, jurisdictions, return targets,
 * data-quality bar). The validation pipeline loads this for the receiving
 * tenant and evaluates each submission against it.
 */
export class OrganizationAppetiteProfile extends Model<
  InferAttributes<OrganizationAppetiteProfile>,
  InferCreationAttributes<OrganizationAppetiteProfile>
> {
  declare id: CreationOptional<number>;
  declare organizationId: number;
  declare name: CreationOptional<string>;
  declare description: string | null;
  declare status: CreationOptional<string>;
  declare isDefault: CreationOptional<boolean>;

  // Investment & capital appetite
  declare currency: CreationOptional<string>;
  declare totalDeployableCapital: string | null;
  declare minTargetYield: string | null;
  declare maxLineSize: string | null;
  declare minCoverageLimit: string | null;
  declare maxCoverageLimit: string | null;
  declare capacityByPeril: CreationOptional<Record<string, number>>;

  // Risk / peril appetite
  declare preferredPerils: CreationOptional<string[]>;
  declare excludedPerils: CreationOptional<string[]>;
  declare allowedLinesOfBusiness: CreationOptional<string[]>;

  // Geographic appetite
  declare preferredJurisdictions: CreationOptional<string[]>;
  declare excludedJurisdictions: CreationOptional<string[]>;

  // Data-quality appetite
  declare minDataQualityScore: number | null;
  declare requiredFields: CreationOptional<string[]>;

  declare createdByUserId: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

/**
 * A user-defined validation rule attached to an appetite profile. These extend
 * the structured appetite with arbitrary field-level checks. Each rule carries
 * its own severity so the organization controls, per rule, whether a violation
 * rejects, flags for review, or merely warns.
 */
export class OrganizationValidationRule extends Model<
  InferAttributes<OrganizationValidationRule>,
  InferCreationAttributes<OrganizationValidationRule>
> {
  declare id: CreationOptional<number>;
  declare appetiteProfileId: number;
  declare organizationId: number;
  declare name: string;
  declare description: CreationOptional<string | null>;
  declare field: string;
  declare operator: string;
  declare value: unknown;
  declare severity: CreationOptional<string>;
  declare enabled: CreationOptional<boolean>;
  declare sortOrder: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initAppetiteModels(sequelize: Sequelize): void {
  OrganizationAppetiteProfile.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      organizationId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Default Appetite' },
      description: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'active' },
      isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

      currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'USD' },
      totalDeployableCapital: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      minTargetYield: { type: DataTypes.DECIMAL(6, 4), allowNull: true },
      maxLineSize: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      minCoverageLimit: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      maxCoverageLimit: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      capacityByPeril: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },

      preferredPerils: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      excludedPerils: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      allowedLinesOfBusiness: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },

      preferredJurisdictions: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      excludedJurisdictions: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },

      minDataQualityScore: { type: DataTypes.INTEGER, allowNull: true },
      requiredFields: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: ['riskType', 'limit', 'effectiveDate'],
      },

      createdByUserId: { type: DataTypes.INTEGER, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'OrganizationAppetiteProfile',
      tableName: 'organizationAppetiteProfiles',
      indexes: [
        { fields: ['organizationId'], name: 'idx_org_appetite_profiles_org' },
        { unique: true, fields: ['organizationId', 'name'], name: 'uq_org_appetite_profiles_org_name' },
        { fields: ['organizationId', 'isDefault'], name: 'idx_org_appetite_profiles_default' },
      ],
    },
  );

  OrganizationValidationRule.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      appetiteProfileId: { type: DataTypes.INTEGER, allowNull: false },
      organizationId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      field: { type: DataTypes.STRING, allowNull: false },
      operator: { type: DataTypes.STRING, allowNull: false },
      value: { type: DataTypes.JSONB, allowNull: true },
      severity: { type: DataTypes.STRING, allowNull: false, defaultValue: 'flag' },
      enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'OrganizationValidationRule',
      tableName: 'organizationValidationRules',
      indexes: [
        { fields: ['organizationId'], name: 'idx_org_validation_rules_org' },
        { fields: ['appetiteProfileId'], name: 'idx_org_validation_rules_profile' },
        { fields: ['appetiteProfileId', 'sortOrder'], name: 'idx_org_validation_rules_order' },
      ],
    },
  );
}
