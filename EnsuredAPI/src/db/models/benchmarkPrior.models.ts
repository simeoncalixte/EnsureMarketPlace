import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export const benchmarkPriorStatuses = ['active', 'inactive'] as const;

export type BenchmarkPriorStatus = (typeof benchmarkPriorStatuses)[number];

/**
 * Slice 5.0 — Benchmark Priors.
 *
 * An industry / benchmark prior is the credibility-weighting *anchor* for a risk
 * class: the loss rate (per unit of exposure) and/or target loss ratio the
 * platform falls back to when an org has no internally credible loss experience.
 * Every prior carries a REQUIRED `source` citation string so the number is never
 * undefended. Rows with `organizationId = null` are **platform defaults**; an org
 * row overrides the platform row for the same scope.
 *
 * Resolution follows the same specificity ladder as the registry
 * (`src/pipeline/benchmarkPriors/resolve.ts`):
 *   org+subtype → org+primary → platform+subtype → platform+primary → none.
 *
 * Additive only: this is a brand-new table; it does not alter any existing model.
 * Column naming is camelCase (`underscored: false`, repo default) and matches the
 * migration exactly — mirroring the now-correct riskClassRegistry pattern.
 */
export class BenchmarkPrior extends Model<
  InferAttributes<BenchmarkPrior>,
  InferCreationAttributes<BenchmarkPrior>
> {
  declare id: CreationOptional<number>;
  declare organizationId: number | null;
  declare lineOfBusinessCode: string;
  declare lineOfBusinessSubTypeCode: string;
  declare exposureBasis: string | null;
  declare lossRate: string | null;
  declare targetLossRatio: string | null;
  declare expenseRatio: string | null;
  declare marginTarget: string | null;
  declare fullCredibilityStandard: string | null;
  declare paramsJson: CreationOptional<Record<string, unknown>>;
  declare source: string;
  declare sourceUrl: string | null;
  declare asOfDate: string | null;
  declare status: CreationOptional<BenchmarkPriorStatus>;
  declare createdByUserId: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initBenchmarkPriorModels(sequelize: Sequelize): void {
  BenchmarkPrior.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      organizationId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'organizations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      lineOfBusinessCode: { type: DataTypes.STRING, allowNull: false },
      lineOfBusinessSubTypeCode: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
      exposureBasis: { type: DataTypes.STRING, allowNull: true },
      lossRate: { type: DataTypes.DECIMAL(18, 8), allowNull: true },
      targetLossRatio: { type: DataTypes.DECIMAL(10, 6), allowNull: true },
      expenseRatio: { type: DataTypes.DECIMAL(10, 6), allowNull: true },
      marginTarget: { type: DataTypes.DECIMAL(10, 6), allowNull: true },
      fullCredibilityStandard: { type: DataTypes.DECIMAL(18, 4), allowNull: true },
      paramsJson: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      // REQUIRED citation — there is no undefended number in this table.
      source: { type: DataTypes.STRING, allowNull: false },
      sourceUrl: { type: DataTypes.STRING, allowNull: true },
      asOfDate: { type: DataTypes.DATEONLY, allowNull: true },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'active',
        validate: { isIn: [benchmarkPriorStatuses] },
      },
      createdByUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: 'BenchmarkPrior',
      tableName: 'benchmark_priors',
      // camelCase columns (repo default) — matches the migration. underscored:true
      // previously broke sync + queries; mirror the corrected riskClassRegistry.
      underscored: false,
      indexes: [
        {
          unique: true,
          name: 'benchmark_priors_scope_unique',
          fields: ['organizationId', 'lineOfBusinessCode', 'lineOfBusinessSubTypeCode'],
        },
        {
          name: 'benchmark_priors_scope_status_idx',
          fields: ['organizationId', 'lineOfBusinessCode', 'lineOfBusinessSubTypeCode', 'status'],
        },
      ],
    },
  );
}
