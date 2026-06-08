import { DataTypes, QueryInterface, Transaction } from 'sequelize';

async function columnExists(
  context: QueryInterface,
  tableName: string,
  columnName: string,
  transaction: Transaction,
): Promise<boolean> {
  const description = await context.describeTable(tableName, { transaction });
  return Object.prototype.hasOwnProperty.call(description, columnName);
}

/**
 * Add a `source` column to pageTemplates so a template's provenance (human-authored
 * vs. produced/extended by the schema-generation LLM stage) is durable. Existing
 * rows default to 'human'; the schema-generation stage writes 'ai'.
 */
export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    if (!(await columnExists(context, 'pageTemplates', 'source', transaction))) {
      await context.addColumn(
        'pageTemplates',
        'source',
        { type: DataTypes.STRING, allowNull: false, defaultValue: 'human' },
        { transaction },
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
    if (await columnExists(context, 'pageTemplates', 'source', transaction)) {
      await context.removeColumn('pageTemplates', 'source', { transaction });
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
