import { QueryInterface, Transaction } from 'sequelize';

/**
 * Renames the legacy `businessUnit` concept to `lineOfBusiness` for any database
 * that already ran the earlier capacity-governance migrations before they were
 * updated in place:
 *   - `capacityDefinitions.businessUnit` column → `lineOfBusiness`
 *   - `governance.org.businessUnit` option-set key → `governance.org.lineOfBusiness`
 *     (across global and every per-org override row), re-labelled 'Line of Business'.
 *
 * Both steps are guarded so this is a clean no-op on a fresh database (where the
 * updated create/seed migrations already produce the new names).
 */

const OLD_KEY = 'governance.org.businessUnit';
const NEW_KEY = 'governance.org.lineOfBusiness';
const NEW_LABEL = 'Line of Business';

async function columnExists(context: QueryInterface, table: string, column: string): Promise<boolean> {
  const described = await context.describeTable(table);
  return Object.prototype.hasOwnProperty.call(described, column);
}

async function tableExists(context: QueryInterface, table: string, transaction: Transaction): Promise<boolean> {
  const names = await context.showAllTables({ transaction });
  const normalized = names.map((value) =>
    typeof value === 'string' ? value : (value as { tableName: string }).tableName,
  );
  return normalized.includes(table);
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    if (await tableExists(context, 'capacityDefinitions', transaction)) {
      const hasOld = await columnExists(context, 'capacityDefinitions', 'businessUnit');
      const hasNew = await columnExists(context, 'capacityDefinitions', 'lineOfBusiness');
      if (hasOld && !hasNew) {
        await context.renameColumn('capacityDefinitions', 'businessUnit', 'lineOfBusiness', { transaction });
      }
    }

    // Rename the option-set key on every row carrying it (global + per-org).
    await context.sequelize.query(
      `UPDATE "schema_option_sets" SET "option_set_key" = :newKey, "label" = :newLabel, "updated_at" = :now WHERE "option_set_key" = :oldKey`,
      { replacements: { newKey: NEW_KEY, newLabel: NEW_LABEL, oldKey: OLD_KEY, now: new Date() }, transaction },
    );

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function down(_args: { context: QueryInterface }): Promise<void> {
  // No-op: the create/seed migrations now own the `lineOfBusiness` naming, so
  // reversing this rename would diverge a fresh database from an upgraded one.
}
