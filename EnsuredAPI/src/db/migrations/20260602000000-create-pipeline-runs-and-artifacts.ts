import { DataTypes, QueryInterface } from 'sequelize';

/**
 * Creates the pipeline replay backbone: `pipeline_runs`, `stage_executions` and
 * `pipeline_artifacts` (backing the PipelineRun / StageExecution /
 * PipelineArtifact models).
 *
 * Together they turn the document pipeline from a destructive, un-replayable flow
 * into an append-only, content-addressed history: each stage run is recorded with
 * the input it consumed and the output it produced, grouped under a run, so a
 * submission's journey can be played back and re-run deterministically.
 */

async function tableExists(context: QueryInterface, name: string): Promise<boolean> {
  const tables = await context.showAllTables();
  return tables.map((t) => String(t).toLowerCase()).includes(name.toLowerCase());
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    if (!(await tableExists(context, 'pipeline_runs'))) {
      await context.createTable(
        'pipeline_runs',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
          submission_id: { type: DataTypes.INTEGER, allowNull: true },
          tenant_id: { type: DataTypes.INTEGER, allowNull: true },
          trigger: { type: DataTypes.STRING, allowNull: true },
          triggered_by_user_id: { type: DataTypes.INTEGER, allowNull: true },
          parent_run_id: { type: DataTypes.INTEGER, allowNull: true },
          from_stage: { type: DataTypes.STRING, allowNull: true },
          to_stage: { type: DataTypes.STRING, allowNull: true },
          status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'running' },
          idempotency_key: { type: DataTypes.STRING, allowNull: true },
          started_at: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
          finished_at: { type: DataTypes.DATE, allowNull: true },
          created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
          updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        { transaction },
      );
      await context.addIndex('pipeline_runs', ['submission_id'], { transaction });
      await context.addIndex('pipeline_runs', ['status'], { transaction });
      await context.addIndex('pipeline_runs', ['idempotency_key'], { transaction });
    }

    if (!(await tableExists(context, 'pipeline_artifacts'))) {
      await context.createTable(
        'pipeline_artifacts',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
          run_id: { type: DataTypes.INTEGER, allowNull: true },
          submission_id: { type: DataTypes.INTEGER, allowNull: true },
          tenant_id: { type: DataTypes.INTEGER, allowNull: true },
          stage_key: { type: DataTypes.STRING, allowNull: false },
          role: { type: DataTypes.STRING, allowNull: false },
          content_hash: { type: DataTypes.STRING, allowNull: true },
          media_type: { type: DataTypes.STRING, allowNull: true, defaultValue: 'application/json' },
          payload: { type: DataTypes.JSONB, allowNull: true },
          size_bytes: { type: DataTypes.INTEGER, allowNull: true },
          created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        { transaction },
      );
      await context.addIndex('pipeline_artifacts', ['run_id'], { transaction });
      await context.addIndex('pipeline_artifacts', ['submission_id'], { transaction });
      await context.addIndex('pipeline_artifacts', ['run_id', 'role'], { transaction });
      await context.addIndex('pipeline_artifacts', ['content_hash'], { transaction });
    }

    if (!(await tableExists(context, 'stage_executions'))) {
      await context.createTable(
        'stage_executions',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
          run_id: { type: DataTypes.INTEGER, allowNull: true },
          submission_id: { type: DataTypes.INTEGER, allowNull: true },
          tenant_id: { type: DataTypes.INTEGER, allowNull: true },
          stage_key: { type: DataTypes.STRING, allowNull: false },
          attempt: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
          status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'completed' },
          input_artifact_id: { type: DataTypes.INTEGER, allowNull: true },
          output_artifact_id: { type: DataTypes.INTEGER, allowNull: true },
          provider: { type: DataTypes.STRING, allowNull: true },
          provider_version: { type: DataTypes.STRING, allowNull: true },
          duration_ms: { type: DataTypes.INTEGER, allowNull: true },
          started_at: { type: DataTypes.DATE, allowNull: true },
          finished_at: { type: DataTypes.DATE, allowNull: true },
          error_message: { type: DataTypes.TEXT, allowNull: true },
          metadata: { type: DataTypes.JSONB, allowNull: true },
          created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        { transaction },
      );
      await context.addIndex('stage_executions', ['run_id'], { transaction });
      await context.addIndex('stage_executions', ['submission_id'], { transaction });
      await context.addIndex('stage_executions', ['run_id', 'stage_key'], { transaction });
    }

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  // Drop executions/artifacts before runs (they reference run_id).
  for (const table of ['stage_executions', 'pipeline_artifacts', 'pipeline_runs']) {
    if (await tableExists(context, table)) {
      await context.dropTable(table);
    }
  }
}
