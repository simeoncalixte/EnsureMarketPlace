import { DataTypes, QueryInterface, Transaction } from 'sequelize';

/**
 * Multi-tenant option-set overlay (additive) + seed the capacity-status list.
 *
 * - Adds `hidden_values` JSONB to `schema_option_sets` so a tenant set can hide
 *   specific global default items without copying the whole set (overlay model).
 * - Seeds the global `governance.capacity.status` option set if absent, so the
 *   New Capacity form's Status select has options out of the box.
 */

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) =>
    typeof value === 'string' ? value : (value as { tableName: string }).tableName,
  );
  return normalized.includes(tableName);
}

async function columnExists(context: QueryInterface, tableName: string, column: string): Promise<boolean> {
  const table = await context.describeTable(tableName);
  return Object.prototype.hasOwnProperty.call(table, column);
}

const STATUS_KEY = 'governance.capacity.status';
const STATUS_ITEMS = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'retired', label: 'Retired' },
];

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  const now = new Date();
  try {
    if (
      (await tableExists(context, 'schema_option_sets', transaction)) &&
      !(await columnExists(context, 'schema_option_sets', 'hidden_values'))
    ) {
      await context.addColumn(
        'schema_option_sets',
        'hidden_values',
        { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
        { transaction },
      );
    }

    // Seed the global capacity-status set if it doesn't exist yet.
    const [existing] = (await context.sequelize.query(
      `SELECT id FROM "schema_option_sets" WHERE "option_set_key" = :key AND "organization_id" IS NULL LIMIT 1`,
      { replacements: { key: STATUS_KEY }, transaction },
    )) as [Array<{ id: number }>, unknown];

    if (!existing || existing.length === 0) {
      await context.bulkInsert(
        'schema_option_sets',
        [{ organization_id: null, option_set_key: STATUS_KEY, label: 'Capacity Status', line_of_business_code: '', line_of_business_sub_type_code: '', source: 'seed', created_at: now, updated_at: now }],
        { transaction },
      );
      const [headerRows] = (await context.sequelize.query(
        `SELECT id FROM "schema_option_sets" WHERE "option_set_key" = :key AND "organization_id" IS NULL ORDER BY id DESC LIMIT 1`,
        { replacements: { key: STATUS_KEY }, transaction },
      )) as [Array<{ id: number }>, unknown];
      const headerId = headerRows?.[0]?.id;
      if (headerId) {
        await context.bulkInsert(
          'schema_option_set_items',
          STATUS_ITEMS.map((item, index) => ({
            option_set_id: headerId,
            value: item.value,
            label: item.label,
            order: index + 1,
            created_at: now,
            updated_at: now,
          })),
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
    if (
      (await tableExists(context, 'schema_option_sets', transaction)) &&
      (await columnExists(context, 'schema_option_sets', 'hidden_values'))
    ) {
      await context.removeColumn('schema_option_sets', 'hidden_values', { transaction });
    }
    // Leave the seeded status set in place on down — harmless and may be referenced.
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
