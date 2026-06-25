import { DataTypes, QueryInterface } from 'sequelize';

/**
 * Creates `agent_traces` (backing the AgentTrace model): one row per LLM agent
 * call made during a pipeline stage execution, recording the exact prompt sent
 * and the raw model response. This is the transcript behind the pipeline UI's
 * "agent activity" view — the parsed/validated result already lives in the
 * stage's output artifact; this table preserves the conversation that produced
 * it so reviewers can verify what the agent was asked and what it answered.
 */

async function tableExists(context: QueryInterface, name: string): Promise<boolean> {
  const tables = await context.showAllTables();
  return tables.map((t) => String(t).toLowerCase()).includes(name.toLowerCase());
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  if (await tableExists(context, 'agent_traces')) return;
  const transaction = await context.sequelize.transaction();
  try {
    await context.createTable(
      'agent_traces',
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        run_id: { type: DataTypes.INTEGER, allowNull: true },
        execution_id: { type: DataTypes.INTEGER, allowNull: true },
        submission_id: { type: DataTypes.INTEGER, allowNull: true },
        tenant_id: { type: DataTypes.INTEGER, allowNull: true },
        stage_key: { type: DataTypes.STRING, allowNull: false },
        seq: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
        agent: { type: DataTypes.STRING, allowNull: false },
        model: { type: DataTypes.STRING, allowNull: true },
        prompt_version: { type: DataTypes.STRING, allowNull: true },
        prompt: { type: DataTypes.TEXT, allowNull: true },
        response_text: { type: DataTypes.TEXT, allowNull: true },
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'completed' },
        error_message: { type: DataTypes.TEXT, allowNull: true },
        duration_ms: { type: DataTypes.INTEGER, allowNull: true },
        started_at: { type: DataTypes.DATE, allowNull: true },
        finished_at: { type: DataTypes.DATE, allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      },
      { transaction },
    );
    await context.addIndex('agent_traces', ['submission_id'], { transaction });
    await context.addIndex('agent_traces', ['run_id'], { transaction });
    await context.addIndex('agent_traces', ['execution_id'], { transaction });
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  if (await tableExists(context, 'agent_traces')) {
    await context.dropTable('agent_traces');
  }
}
