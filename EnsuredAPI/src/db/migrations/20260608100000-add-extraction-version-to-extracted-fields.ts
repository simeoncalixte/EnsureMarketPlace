import { DataTypes, QueryInterface, Transaction } from 'sequelize';

/**
 * Additive: add `extraction_version` to `extracted_fields` so reruns of the
 * extraction stage append a NEW, auditable generation of rows instead of
 * silently duplicating (the old code re-ran `ExtractedField.create` without
 * deleting prior rows → undifferentiated duplicates with no history).
 *
 * Strictly additive — a single nullable column defaulted to 1, so every pre-
 * existing row reads as version 1 and nothing else changes. `ExtractedField` is
 * `underscored: true`, so the physical column is snake_case `extraction_version`
 * to match the model attribute `extractionVersion`. The down migration drops
 * only this column.
 */

const TABLE = 'extracted_fields';
const COLUMN = 'extraction_version';

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) => (typeof value === 'string' ? value : (value as any).tableName));
  return normalized.includes(tableName);
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    if (await tableExists(context, TABLE, transaction)) {
      const description = await context.describeTable(TABLE, { transaction } as any);
      if (!description[COLUMN]) {
        await context.addColumn(
          TABLE,
          COLUMN,
          { type: DataTypes.INTEGER, allowNull: true, defaultValue: 1 },
          { transaction },
        );
      }
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
    if (await tableExists(context, TABLE, transaction)) {
      const description = await context.describeTable(TABLE, { transaction } as any);
      if (description[COLUMN]) {
        await context.removeColumn(TABLE, COLUMN, { transaction });
      }
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
