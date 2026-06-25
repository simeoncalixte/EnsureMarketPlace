/**
 * H1 + naming cleanup — `tenantId` → `organizationId`.
 *
 * The owning-org column was historically the (misleadingly named, legacy)
 * `tenantId`, with no foreign key. This:
 *   1. renames the physical column to `organization_id` on every org-scoped table
 *      (most were `tenant_id`; compliance tables used camelCase `tenantId`), and
 *   2. adds a nullable FK to `organizations(id)` so non-null values are validated.
 *
 * The column stays NULLABLE — records can be ingested before the owning org is
 * resolved — so the FK only constrains non-null values (`ON DELETE SET NULL`).
 * Idempotent and guarded: skips tables/columns already in the target shape, and
 * tolerates an existing constraint. Runs in one transaction.
 *
 * NOTE: this does NOT rename the Microsoft-OAuth `tenantId` carried in email
 * channel credentials (a different concept) — that lives in JSON config, not a
 * column, and is untouched.
 */
import { QueryInterface } from 'sequelize';

// [table, legacy column name] — legacy name is restored on `down`.
const ORG_TABLES: Array<[string, string]> = [
  ['compliance_clearances', 'tenantId'],
  ['sanctions_screens', 'tenantId'],
  ['signature_requests', 'tenant_id'],
  ['quotes', 'tenant_id'],
  ['pipeline_runs', 'tenant_id'],
  ['stage_executions', 'tenant_id'],
  ['pipeline_artifacts', 'tenant_id'],
  ['agent_traces', 'tenant_id'],
  ['submission_files', 'tenant_id'],
  ['ingestion_events', 'tenant_id'],
  ['submission_outputs', 'tenant_id'],
  ['extracted_fields', 'tenant_id'],
  ['canonical_submissions', 'tenant_id'],
  ['enrichment_data', 'tenant_id'],
  ['triage_results', 'tenant_id'],
  ['workflow_states', 'tenant_id'],
  ['ingestion_channels', 'tenant_id'],
];

const NEW_COLUMN = 'organization_id';
const has = (description: Record<string, unknown>, name: string): boolean =>
  Object.prototype.hasOwnProperty.call(description, name);
const constraintName = (table: string): string => `fk_${table}_organization`;

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    for (const [table, legacy] of ORG_TABLES) {
      let description: Record<string, unknown>;
      try {
        description = await context.describeTable(table, { transaction } as never);
      } catch {
        continue; // table not present in this environment
      }
      if (!has(description, NEW_COLUMN) && has(description, legacy)) {
        await context.renameColumn(table, legacy, NEW_COLUMN, { transaction });
      }
      // Re-describe so the FK targets the (possibly just-renamed) column.
      const after = await context.describeTable(table, { transaction } as never);
      if (!has(after, NEW_COLUMN)) continue;
      try {
        await context.addConstraint(table, {
          fields: [NEW_COLUMN],
          type: 'foreign key',
          name: constraintName(table),
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
    for (const [table, legacy] of ORG_TABLES) {
      try {
        await context.removeConstraint(table, constraintName(table), { transaction });
      } catch {
        // never created / already gone
      }
      let description: Record<string, unknown>;
      try {
        description = await context.describeTable(table, { transaction } as never);
      } catch {
        continue;
      }
      if (has(description, NEW_COLUMN) && !has(description, legacy)) {
        await context.renameColumn(table, NEW_COLUMN, legacy, { transaction });
      }
    }
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}
