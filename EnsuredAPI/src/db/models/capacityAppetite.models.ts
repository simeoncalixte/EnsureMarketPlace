import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

/**
 * Capacity-appetite extension tables — the governance equivalents of the legacy
 * appetite domain's per-location limits and custom validation rules, re-keyed to
 * `capacityDefinitionId`. Together with the `appetite` JSONB block on
 * `CapacityDefinition`, these let the active capacity definition fully drive the
 * validation pipeline's appetite enforcement (see
 * `pipeline/validation/definitionToAppetiteProfile.ts`).
 *
 * These deliberately preserve the exact shape of the legacy
 * `AppetiteLocationLimit` / `OrganizationValidationRule` so the battle-tested
 * pure enforcement engine (`appetiteEngine.evaluateAppetite` / `ruleSchema`)
 * stays unchanged — only the data source moves.
 */

/** Per-location limit (LOB × location), keyed by capacity definition. */
export class CapacityLocationLimit extends Model<
  InferAttributes<CapacityLocationLimit>,
  InferCreationAttributes<CapacityLocationLimit>
> {
  declare id: CreationOptional<number>;
  declare capacityDefinitionId: number;
  declare organizationId: number;
  /** Line of business code, or `'*'` for all lines. */
  declare lineOfBusinessCode: CreationOptional<string>;
  /** Encoded jurisdiction ref, e.g. `US`, `US/Florida`, `US/Florida/Tampa`. */
  declare entry: string;
  declare level: 'country' | 'state' | 'city';
  /** Geography ids resolved from `entry` at write time (best-effort, nullable). */
  declare countryId: number | null;
  declare stateProvinceId: number | null;
  declare cityId: number | null;
  declare maxLineSize: string | null;
  declare aggregateLimit: string | null;
  /** Per-occurrence (single event) limit — distinct from per-risk and aggregate. */
  declare perOccurrenceLimit: string | null;
  /** Graded appetite for this location × LOB: target | acceptable | restricted | refer | decline. */
  declare appetiteStance: string | null;
  /** Pricing-adequacy floors for risks in this location. */
  declare minimumPremium: string | null;
  /** Minimum rate-on-line, stored as a percentage value (e.g. 2.5 = 2.5%). */
  declare minRateOnLine: string | null;
  /** Refer any risk whose line size exceeds this amount in this location. */
  declare referralThreshold: string | null;
  /** Effective window for this location rule (ISO date strings, inclusive). */
  declare effectiveFrom: string | null;
  declare effectiveTo: string | null;
  declare currency: CreationOptional<string>;
  declare enabled: CreationOptional<boolean>;
  declare createdByUserId: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

/**
 * A flat custom validation rule attached to a capacity definition. 1:1 port of
 * the legacy `OrganizationValidationRule` so `evaluateCustomRules` / `ruleSchema`
 * (field/operator/value/severity) are reused verbatim.
 */
export class CapacityValidationRule extends Model<
  InferAttributes<CapacityValidationRule>,
  InferCreationAttributes<CapacityValidationRule>
> {
  declare id: CreationOptional<number>;
  declare capacityDefinitionId: number;
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

export function initCapacityAppetiteModels(sequelize: Sequelize): void {
  CapacityLocationLimit.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      capacityDefinitionId: { type: DataTypes.INTEGER, allowNull: false },
      organizationId: { type: DataTypes.INTEGER, allowNull: false },
      lineOfBusinessCode: { type: DataTypes.STRING, allowNull: false, defaultValue: '*' },
      entry: { type: DataTypes.STRING, allowNull: false },
      level: { type: DataTypes.STRING, allowNull: false },
      countryId: { type: DataTypes.INTEGER, allowNull: true },
      stateProvinceId: { type: DataTypes.INTEGER, allowNull: true },
      cityId: { type: DataTypes.INTEGER, allowNull: true },
      maxLineSize: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      aggregateLimit: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      perOccurrenceLimit: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      appetiteStance: { type: DataTypes.STRING, allowNull: true },
      minimumPremium: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      minRateOnLine: { type: DataTypes.DECIMAL(9, 4), allowNull: true },
      referralThreshold: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      effectiveFrom: { type: DataTypes.DATEONLY, allowNull: true },
      effectiveTo: { type: DataTypes.DATEONLY, allowNull: true },
      currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'USD' },
      enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdByUserId: { type: DataTypes.INTEGER, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'CapacityLocationLimit',
      tableName: 'capacityLocationLimits',
      indexes: [
        { fields: ['organizationId'], name: 'idx_capacity_loc_limits_org' },
        { fields: ['capacityDefinitionId'], name: 'idx_capacity_loc_limits_def' },
        {
          unique: true,
          fields: ['capacityDefinitionId', 'lineOfBusinessCode', 'entry'],
          name: 'uq_capacity_loc_limits_def_lob_entry',
        },
      ],
    },
  );

  CapacityValidationRule.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      capacityDefinitionId: { type: DataTypes.INTEGER, allowNull: false },
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
      modelName: 'CapacityValidationRule',
      tableName: 'capacityValidationRules',
      indexes: [
        { fields: ['organizationId'], name: 'idx_capacity_validation_rules_org' },
        { fields: ['capacityDefinitionId'], name: 'idx_capacity_validation_rules_def' },
        { fields: ['capacityDefinitionId', 'sortOrder'], name: 'idx_capacity_validation_rules_order' },
      ],
    },
  );
}
