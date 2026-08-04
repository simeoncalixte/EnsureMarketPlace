import { DataTypes, QueryInterface } from 'sequelize';

async function tableExists(context: QueryInterface, name: string): Promise<boolean> {
  const tables = await context.showAllTables();
  return tables.map((table) => String(table).toLowerCase()).includes(name.toLowerCase());
}

/**
 * Repairs databases that recorded the pipeline-state hardening migration before
 * `pipeline_artifacts.private_payload` was successfully created.
 */
export async function up({ context }: { context: QueryInterface }): Promise<void> {
  if (!(await tableExists(context, 'pipeline_artifacts'))) return;

  const columns = await context.describeTable('pipeline_artifacts');
  if (!columns.private_payload) {
    await context.addColumn('pipeline_artifacts', 'private_payload', {
      type: DataTypes.JSONB,
      allowNull: true,
    });
  }
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  if (!(await tableExists(context, 'pipeline_artifacts'))) return;

  const columns = await context.describeTable('pipeline_artifacts');
  if (columns.private_payload) await context.removeColumn('pipeline_artifacts', 'private_payload');
}
