import { QueryInterface, Transaction } from 'sequelize';
import { lineOfBusinessTaxonomy } from '../seed-data/lineOfBusinessTaxonomy';

/**
 * Re-points the `governance.org.lineOfBusiness` option set at the canonical Line
 * of Business taxonomy, so the Capacity editor's Line of Business dropdown offers
 * the full LOB primary types rather than the short starter list the governance
 * seed (20260621000100) planted.
 *
 * Scope: only the GLOBAL set (organization_id IS NULL) is rewritten. Per-org
 * copy-on-write overrides are user-owned and deliberately left untouched.
 *
 * Reversible: `down()` restores the seed's starter values.
 */

const KEY = 'governance.org.lineOfBusiness';
const LOB_LABEL = 'Line of Business';

/** Seed starter values — restored on rollback. */
const ORIGINAL_ITEMS = [
  { value: 'property', label: 'Property' },
  { value: 'general_liability', label: 'General Liability' },
  { value: 'specialty', label: 'Specialty' },
];

/** Canonical LOB primary types become the line-of-business options. */
const LOB_ITEMS = lineOfBusinessTaxonomy.map((primary) => ({
  value: primary.code,
  label: primary.label,
}));

/** Resolves the global header id, creating the set if it is somehow missing. */
async function ensureGlobalHeaderId(
  context: QueryInterface,
  label: string,
  transaction: Transaction,
  now: Date,
): Promise<number> {
  const [rows] = (await context.sequelize.query(
    `SELECT id FROM "schema_option_sets" WHERE "option_set_key" = :key AND "organization_id" IS NULL ORDER BY id ASC LIMIT 1`,
    { replacements: { key: KEY }, transaction },
  )) as [Array<{ id: number }>, unknown];
  if (rows?.[0]?.id) return rows[0].id;

  await context.bulkInsert(
    'schema_option_sets',
    [
      {
        organization_id: null,
        option_set_key: KEY,
        label,
        line_of_business_code: '',
        line_of_business_sub_type_code: '',
        source: 'seed',
        created_at: now,
        updated_at: now,
      },
    ],
    { transaction },
  );
  const [created] = (await context.sequelize.query(
    `SELECT id FROM "schema_option_sets" WHERE "option_set_key" = :key AND "organization_id" IS NULL ORDER BY id DESC LIMIT 1`,
    { replacements: { key: KEY }, transaction },
  )) as [Array<{ id: number }>, unknown];
  return created[0].id;
}

/** Replaces the header's items wholesale (delete-then-insert → idempotent). */
async function replaceItems(
  context: QueryInterface,
  headerId: number,
  label: string,
  items: Array<{ value: string; label: string }>,
  transaction: Transaction,
  now: Date,
): Promise<void> {
  await context.sequelize.query(
    `UPDATE "schema_option_sets" SET "label" = :label, "updated_at" = :now WHERE "id" = :id`,
    { replacements: { label, now, id: headerId }, transaction },
  );
  await context.sequelize.query(`DELETE FROM "schema_option_set_items" WHERE "option_set_id" = :id`, {
    replacements: { id: headerId },
    transaction,
  });
  await context.bulkInsert(
    'schema_option_set_items',
    items.map((item, index) => ({
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

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  const now = new Date();
  try {
    const headerId = await ensureGlobalHeaderId(context, LOB_LABEL, transaction, now);
    await replaceItems(context, headerId, LOB_LABEL, LOB_ITEMS, transaction, now);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  const now = new Date();
  try {
    const [rows] = (await context.sequelize.query(
      `SELECT id FROM "schema_option_sets" WHERE "option_set_key" = :key AND "organization_id" IS NULL ORDER BY id ASC LIMIT 1`,
      { replacements: { key: KEY }, transaction },
    )) as [Array<{ id: number }>, unknown];
    const headerId = rows?.[0]?.id;
    if (headerId) {
      await replaceItems(context, headerId, LOB_LABEL, ORIGINAL_ITEMS, transaction, now);
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
