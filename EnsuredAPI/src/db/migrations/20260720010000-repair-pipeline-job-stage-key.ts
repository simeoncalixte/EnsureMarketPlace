import { DataTypes, QueryInterface } from 'sequelize';

async function tableExists(context: QueryInterface, name: string): Promise<boolean> {
  const tables = await context.showAllTables();
  return tables.map((table) => String(table).toLowerCase()).includes(name.toLowerCase());
}

/**
 * Repairs databases that applied the original pipeline-jobs migration before
 * resumable-stage support introduced `stage_key` to the model and migration.
 *
 * The preceding create migration cannot be replayed on an already-migrated
 * database, so this forward-only migration is deliberately idempotent.
 */
export async function up({ context }: { context: QueryInterface }): Promise<void> {
  if (!(await tableExists(context, 'pipeline_jobs'))) return;

  const columns = await context.describeTable('pipeline_jobs');
  if (!columns.stage_key) {
    await context.addColumn('pipeline_jobs', 'stage_key', {
      type: DataTypes.STRING,
      allowNull: true,
    });
  }
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  if (!(await tableExists(context, 'pipeline_jobs'))) return;

  const columns = await context.describeTable('pipeline_jobs');
  if (columns.stage_key) await context.removeColumn('pipeline_jobs', 'stage_key');
}
