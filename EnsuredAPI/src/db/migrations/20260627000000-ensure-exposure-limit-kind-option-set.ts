import { QueryInterface, Transaction } from 'sequelize';

/**
 * Guarantees the Exposure → "Limit Enforcement" picklist
 * (`governance.exposure.limitKind`) has default global values.
 *
 * The original governance seed (20260621000100) is idempotent and skips any key
 * already present, so if that migration ran *before* the limitKind entry was
 * added to it, the set was never seeded — leaving the Capacity Definitions
 * editor's Limit Enforcement dropdown empty. This standalone, later-timestamped
 * migration backfills the global (organization_id = null) set if and only if it
 * is missing, so it is safe to run alongside or after the original seed.
 */

const OPTION_SET = {
  key: 'governance.exposure.limitKind',
  label: 'Limit Enforcement',
  items: [
    { value: 'hard_limit', label: 'Hard Limit' },
    { value: 'soft_limit', label: 'Soft Limit' },
    { value: 'referral_threshold', label: 'Referral Threshold' },
  ],
};

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
    if (await globalSetExists(context, OPTION_SET.key, transaction)) {
      await transaction.commit();
      return;
    }

    await context.bulkInsert(
      'schema_option_sets',
      [
        {
          organization_id: null,
          option_set_key: OPTION_SET.key,
          label: OPTION_SET.label,
          line_of_business_code: '',
          line_of_business_sub_type_code: '',
          source: 'seed',
          created_at: now,
          updated_at: now,
        },
      ],
      { transaction },
    );

    const [headerRows] = (await context.sequelize.query(
      `SELECT id FROM "schema_option_sets" WHERE "option_set_key" = :key AND "organization_id" IS NULL ORDER BY id DESC LIMIT 1`,
      { replacements: { key: OPTION_SET.key }, transaction },
    )) as [Array<{ id: number }>, unknown];
    const headerId = headerRows?.[0]?.id;
    if (headerId) {
      await context.bulkInsert(
        'schema_option_set_items',
        OPTION_SET.items.map((item, index) => ({
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

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function down(_args: { context: QueryInterface }): Promise<void> {
  // No-op: this migration only backfills a missing global default and must not
  // remove the set, which may now be shared/edited. The original seed migration
  // (20260621000100) owns the canonical teardown for this key.
}
