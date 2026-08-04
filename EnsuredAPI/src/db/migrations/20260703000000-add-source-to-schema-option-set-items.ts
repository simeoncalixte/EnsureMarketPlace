import { DataTypes, QueryInterface } from 'sequelize';

/**
 * Add a per-ITEM `source` to `schema_option_set_items` ('ai' | 'human').
 *
 * Why: the schema-generation stage REPLACES an option set's items wholesale on
 * every regeneration. Without a per-item source it cannot tell an AI-generated
 * option from one a user added in the submission view, so user additions were
 * destroyed on the next generation. With this column, regeneration deletes only
 * `source = 'ai'` items and preserves `source = 'human'` ones.
 *
 * Backfill: existing items inherit their SET's source (the header already carries
 * 'ai'|'human'), so prior tenant-added items on human-sourced sets stay 'human'
 * (destroyable) and AI baselines stay 'ai'. Strictly additive, idempotent.
 */

const TABLE = 'schema_option_set_items';
const COLUMN = 'source';

function hasColumn(description: Record<string, unknown>, col: string): boolean {
  return Object.keys(description).some((c) => c === col || c.toLowerCase() === col.toLowerCase());
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    const desc = await context.describeTable(TABLE, { transaction });
    if (!hasColumn(desc, COLUMN)) {
      await context.addColumn(
        TABLE,
        COLUMN,
        { type: DataTypes.STRING, allowNull: false, defaultValue: 'ai' },
        { transaction },
      );
      // Existing items inherit their set's source.
      await context.sequelize.query(
        `UPDATE schema_option_set_items i
            SET source = COALESCE(s.source, 'ai')
           FROM schema_option_sets s
          WHERE s.id = i.option_set_id`,
        { transaction },
      );
    }
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    const desc = await context.describeTable(TABLE, { transaction });
    if (hasColumn(desc, COLUMN)) {
      await context.removeColumn(TABLE, COLUMN, { transaction });
    }
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}
