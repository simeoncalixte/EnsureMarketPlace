import { DataTypes, QueryInterface } from 'sequelize';

async function tableExists(context: QueryInterface, name: string): Promise<boolean> {
  const tables = await context.showAllTables();
  return tables.some((table) => String(table).toLowerCase() === name.toLowerCase());
}

async function columnExists(context: QueryInterface, table: string, column: string): Promise<boolean> {
  const columns = await context.describeTable(table);
  return Object.prototype.hasOwnProperty.call(columns, column);
}

/**
 * Pipeline P0 integrity guards. Existing output duplicates are folded into the
 * newest row before the one-row-per-submission invariant is enforced.
 */
export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    if (await tableExists(context, 'submissions') && !(await columnExists(context, 'submissions', 'ingestion_key'))) {
      await context.addColumn('submissions', 'ingestion_key', { type: DataTypes.STRING, allowNull: true }, { transaction });
    }
    if (await tableExists(context, 'submissions')) {
      await context.sequelize.query(
        'CREATE UNIQUE INDEX IF NOT EXISTS submissions_ingestion_key_unique ON submissions (ingestion_key) WHERE ingestion_key IS NOT NULL',
        { transaction },
      );
    }

    if (await tableExists(context, 'submission_outputs')) {
      // Keep the newest row; merge older namespaced stage blocks into it so an
      // upgrade does not discard legacy stage output before adding uniqueness.
      await context.sequelize.query(`
        WITH ranked AS (
          SELECT id, submission_id, structured_data,
                 row_number() OVER (PARTITION BY submission_id ORDER BY id DESC) AS rn
          FROM submission_outputs
        ), merged AS (
          SELECT submission_id, jsonb_object_agg(key, value ORDER BY r.id ASC) AS structured_data
          FROM ranked r, LATERAL jsonb_each(COALESCE(r.structured_data, '{}'::jsonb))
          GROUP BY submission_id
        )
        UPDATE submission_outputs target
        SET structured_data = merged.structured_data
        FROM ranked latest JOIN merged USING (submission_id)
        WHERE target.id = latest.id AND latest.rn = 1
      `, { transaction });
      await context.sequelize.query(`
        DELETE FROM submission_outputs
        WHERE id IN (
          SELECT id FROM (
            SELECT id, row_number() OVER (PARTITION BY submission_id ORDER BY id DESC) AS rn
            FROM submission_outputs
          ) duplicates WHERE rn > 1
        )
      `, { transaction });
      await context.sequelize.query(
        'CREATE UNIQUE INDEX IF NOT EXISTS submission_outputs_submission_id_unique ON submission_outputs (submission_id)',
        { transaction },
      );
    }

    if (await tableExists(context, 'pipeline_runs')) {
      // A transition owns the sole running run for a submission. This is the
      // cross-process mutex for stage advance/rerun.
      await context.sequelize.query(
        "CREATE UNIQUE INDEX IF NOT EXISTS pipeline_runs_one_running_per_submission ON pipeline_runs (submission_id) WHERE status = 'running'",
        { transaction },
      );
    }
    if (await tableExists(context, 'pipeline_artifacts') && !(await columnExists(context, 'pipeline_artifacts', 'private_payload'))) {
      await context.addColumn('pipeline_artifacts', 'private_payload', { type: DataTypes.JSONB, allowNull: true }, { transaction });
    }
    if (await tableExists(context, 'stage_executions')) {
      await context.sequelize.query(
        'CREATE UNIQUE INDEX IF NOT EXISTS stage_executions_run_stage_attempt_unique ON stage_executions (run_id, stage_key, attempt)',
        { transaction },
      );
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  for (const index of [
    'stage_executions_run_stage_attempt_unique',
    'pipeline_runs_one_running_per_submission',
    'submission_outputs_submission_id_unique',
    'submissions_ingestion_key_unique',
  ]) {
    await context.sequelize.query(`DROP INDEX IF EXISTS ${index}`);
  }
  if (await tableExists(context, 'submissions') && await columnExists(context, 'submissions', 'ingestion_key')) {
    await context.removeColumn('submissions', 'ingestion_key');
  }
  if (await tableExists(context, 'pipeline_artifacts') && await columnExists(context, 'pipeline_artifacts', 'private_payload')) {
    await context.removeColumn('pipeline_artifacts', 'private_payload');
  }
}
