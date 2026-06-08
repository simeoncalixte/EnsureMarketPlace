import { DataTypes, QueryInterface, Transaction } from 'sequelize';

/**
 * Slice 2 of the Risk Class Registry — the registry table + strategy resolver.
 *
 * This migration is strictly ADDITIVE and backward-compatible:
 *   - NEW TABLE `risk_class_registry` (binds a behavior declaration —
 *     modeling/rating method, appetite dimensions, required data fields — to a
 *     taxonomy code, per org). Org-null rows are platform defaults.
 *
 * No existing table is touched. No column is dropped, renamed, or made
 * non-nullable. No endpoint is removed. Every existing row/query is unaffected
 * because this only creates one new table. Idempotent guards mirror Slice 1.
 */

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) => (typeof value === 'string' ? value : (value as { tableName: string }).tableName));
  return normalized.includes(tableName);
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    if (!(await tableExists(context, 'risk_class_registry', transaction))) {
      await context.createTable(
        'risk_class_registry',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
          organizationId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'organizations', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          lineOfBusinessCode: { type: DataTypes.STRING, allowNull: false },
          lineOfBusinessSubTypeCode: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
          activeSchemaVersionId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'risk_class_schema_versions', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          riskModelingMethod: { type: DataTypes.STRING, allowNull: true },
          ratingMethod: { type: DataTypes.STRING, allowNull: true },
          appetiteDimensionsJson: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
          requiredDataFieldsJson: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
          methodParamsJson: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
          status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'active' },
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
        { transaction },
      );

      await context.addIndex(
        'risk_class_registry',
        ['organizationId', 'lineOfBusinessCode', 'lineOfBusinessSubTypeCode'],
        {
          unique: true,
          transaction,
          name: 'risk_class_registry_scope_unique',
        },
      );
      await context.addIndex(
        'risk_class_registry',
        ['organizationId', 'lineOfBusinessCode', 'lineOfBusinessSubTypeCode', 'status'],
        {
          transaction,
          name: 'risk_class_registry_scope_status_idx',
        },
      );
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    if (await tableExists(context, 'risk_class_registry', transaction)) {
      await context.dropTable('risk_class_registry', { transaction });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
