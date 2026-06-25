import { QueryInterface, Transaction } from 'sequelize';

/**
 * Seeds the graded per-location appetite stance as a global option set, so the
 * location-limits tear sheet's stance picker is data-driven like the rest of
 * Governance (nothing hardcoded). Idempotent: skipped if the key already exists.
 */

type OptionItem = { value: string; label: string };

const KEY = 'governance.appetite.stance';
const LABEL = 'Appetite Stance';
const ITEMS: OptionItem[] = [
  { value: 'target', label: 'Target' },
  { value: 'acceptable', label: 'Acceptable' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'refer', label: 'Refer' },
  { value: 'decline', label: 'Decline' },
];

async function globalSetExists(context: QueryInterface, key: string, transaction: Transaction): Promise<boolean> {
  const [rows] = (await context.sequelize.query(
    `SELECT id FROM "schema_option_sets" WHERE "option_set_key" = :key AND "organization_id" IS NULL LIMIT 1`,
    { replacements: { key }, transaction },
  )) as [Array<{ id: number }>, unknown];
  return Array.isArray(rows) && rows.length > 0;
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  const now = new Date();
  try {
    if (!(await globalSetExists(context, KEY, transaction))) {
      await context.bulkInsert(
        'schema_option_sets',
        [{ organization_id: null, option_set_key: KEY, label: LABEL, line_of_business_code: '', line_of_business_sub_type_code: '', source: 'seed', created_at: now, updated_at: now }],
        { transaction },
      );

      const [headerRows] = (await context.sequelize.query(
        `SELECT id FROM "schema_option_sets" WHERE "option_set_key" = :key AND "organization_id" IS NULL ORDER BY id DESC LIMIT 1`,
        { replacements: { key: KEY }, transaction },
      )) as [Array<{ id: number }>, unknown];
      const headerId = headerRows?.[0]?.id;
      if (headerId) {
        await context.bulkInsert(
          'schema_option_set_items',
          ITEMS.map((item, index) => ({
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
    const [headerRows] = (await context.sequelize.query(
      `SELECT id FROM "schema_option_sets" WHERE "organization_id" IS NULL AND "option_set_key" = :key`,
      { replacements: { key: KEY }, transaction },
    )) as [Array<{ id: number }>, unknown];
    const ids = (headerRows ?? []).map((r) => r.id);
    if (ids.length > 0) {
      await context.bulkDelete('schema_option_set_items', { option_set_id: ids }, { transaction });
      await context.bulkDelete('schema_option_sets', { id: ids }, { transaction });
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
