import { DataTypes, QueryInterface, Transaction } from 'sequelize';

/**
 * Extends rules-engine rule sets so an outcome is a structured list of actions
 * (calculate / set / create / update / delete / decision) rather than a single
 * label, and records the catalog model each rule runs against.
 *
 *   - `subjectModel`: camelCase catalog key (e.g. `submission`) the rule evaluates.
 *   - `actions`: JSONB array of RuleAction objects executed when conditions match.
 *
 * The legacy `outcome` column is left in place for back-compat.
 */

async function columnExists(
  context: QueryInterface,
  tableName: string,
  columnName: string,
  transaction: Transaction,
): Promise<boolean> {
  const description = await context.describeTable(tableName, { transaction } as never);
  return Object.prototype.hasOwnProperty.call(description, columnName);
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    if (!(await columnExists(context, 'capacityRuleSets', 'subjectModel', transaction))) {
      await context.addColumn('capacityRuleSets', 'subjectModel', { type: DataTypes.STRING, allowNull: true }, { transaction });
    }
    if (!(await columnExists(context, 'capacityRuleSets', 'actions', transaction))) {
      await context.addColumn('capacityRuleSets', 'actions', { type: DataTypes.JSONB, allowNull: false, defaultValue: [] }, { transaction });
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
    if (await columnExists(context, 'capacityRuleSets', 'actions', transaction)) {
      await context.removeColumn('capacityRuleSets', 'actions', { transaction });
    }
    if (await columnExists(context, 'capacityRuleSets', 'subjectModel', transaction)) {
      await context.removeColumn('capacityRuleSets', 'subjectModel', { transaction });
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
