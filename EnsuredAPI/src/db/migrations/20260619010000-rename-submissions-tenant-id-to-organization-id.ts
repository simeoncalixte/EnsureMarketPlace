/**
 * Fix: rename `submissions.tenant_id` → `organization_id` (+ FK).
 *
 * The org-scoped rename (`20260618000000-rename-tenant-id-to-organization-id-and-fk`)
 * renamed the column on all 17 CHILD tables but omitted the `submissions` table
 * itself, so `submissions` kept the legacy `tenant_id` while the `Submission` model
 * and every seed service write `organization_id` — causing
 * `column "organization_id" does not exist` on insert.
 *
 * This completes that rename for `submissions`, mirroring the same guarded,
 * idempotent pattern: rename only when needed, drop the stale tenant index, and add
 * a nullable FK to `organizations(id)` (records can exist before the org is
 * resolved, so the column stays NULLABLE; `ON DELETE SET NULL`).
 */
import { QueryInterface } from 'sequelize';

const TABLE = 'submissions';
const LEGACY = 'tenant_id';
const NEW_COLUMN = 'organization_id';
const FK = 'fk_submissions_organization';
const LEGACY_INDEX = 'idx_submissions_tenant_id';

const has = (description: Record<string, unknown>, name: string): boolean =>
  Object.prototype.hasOwnProperty.call(description, name);

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    const description = await context.describeTable(TABLE, { transaction } as never);

    if (!has(description, NEW_COLUMN) && has(description, LEGACY)) {
      // Drop the legacy index first so the rename doesn't drag a misleadingly-named index along.
      await context.removeIndex(TABLE, LEGACY_INDEX, { transaction }).catch(() => {});
      await context.renameColumn(TABLE, LEGACY, NEW_COLUMN, { transaction });
      await context
        .addIndex(TABLE, [NEW_COLUMN], { name: 'idx_submissions_organization_id', transaction })
        .catch(() => {});
    }

    const after = await context.describeTable(TABLE, { transaction } as never);
    if (has(after, NEW_COLUMN)) {
      try {
        await context.addConstraint(TABLE, {
          fields: [NEW_COLUMN],
          type: 'foreign key',
          name: FK,
          references: { table: 'organizations', field: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          transaction,
        } as never);
      } catch {
        // constraint already exists — leave it in place
      }
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
    await context.removeConstraint(TABLE, FK, { transaction }).catch(() => {});

    const description = await context.describeTable(TABLE, { transaction } as never);
    if (has(description, NEW_COLUMN) && !has(description, LEGACY)) {
      await context.removeIndex(TABLE, 'idx_submissions_organization_id', { transaction }).catch(() => {});
      await context.renameColumn(TABLE, NEW_COLUMN, LEGACY, { transaction });
      await context.addIndex(TABLE, [LEGACY], { name: LEGACY_INDEX, transaction }).catch(() => {});
    }

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}
