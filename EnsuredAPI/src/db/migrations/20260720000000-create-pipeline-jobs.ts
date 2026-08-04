import { DataTypes, QueryInterface } from 'sequelize';

async function tableExists(context: QueryInterface, name: string): Promise<boolean> {
  const tables = await context.showAllTables();
  return tables.map((table) => String(table).toLowerCase()).includes(name.toLowerCase());
}

/** Durable queue for the automatic submission pipeline worker. */
export async function up({ context }: { context: QueryInterface }): Promise<void> {
  if (await tableExists(context, 'pipeline_jobs')) return;
  await context.createTable('pipeline_jobs', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
    submission_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    organization_id: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'queued' },
    stage_key: { type: DataTypes.STRING, allowNull: true },
    attempt_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    max_attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
    next_run_at: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
    locked_at: { type: DataTypes.DATE, allowNull: true },
    locked_by: { type: DataTypes.STRING, allowNull: true },
    last_error: { type: DataTypes.TEXT, allowNull: true },
    completed_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });
  await context.addIndex('pipeline_jobs', ['status', 'next_run_at'], { name: 'pipeline_jobs_ready_idx' });
  await context.addIndex('pipeline_jobs', ['organization_id'], { name: 'pipeline_jobs_organization_idx' });
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  if (await tableExists(context, 'pipeline_jobs')) await context.dropTable('pipeline_jobs');
}
