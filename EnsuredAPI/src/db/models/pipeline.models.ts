import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

/**
 * Pipeline **run / execution / artifact** models — the audit backbone that makes
 * a submission's trip through the document pipeline replayable.
 *
 * - `PipelineRun` groups one pass (or a replay) through the stages for a
 *   submission. Replays point back at the run they re-ran via `parentRunId`.
 * - `StageExecution` is the immutable, append-only record of a single stage run:
 *   its status, timing, provider and the input/output artifacts it consumed and
 *   produced.
 * - `PipelineArtifact` is a content-addressed snapshot of a stage's input or
 *   output payload. Capturing these is what lets the UI render a timeline and
 *   re-run any stage deterministically from its recorded input.
 *
 * Executions and artifacts are append-only (created once, never updated), so the
 * full history of every run is preserved rather than overwritten.
 */

export class PipelineRun extends Model<InferAttributes<PipelineRun>, InferCreationAttributes<PipelineRun>> {
  declare id: CreationOptional<number>;
  declare submissionId: number | null;
  declare organizationId: number | null;
  /** How the run was triggered: 'manual' | 'amqp' | 'sftp' | 'replay' | 'seed'. */
  declare trigger: string | null;
  declare triggeredByUserId: number | null;
  /** When this run is a replay, the run it was replayed from. */
  declare parentRunId: number | null;
  declare fromStage: string | null;
  declare toStage: string | null;
  /** 'running' | 'completed' | 'failed' | 'partial'. */
  declare status: string;
  /** Dedupe key for at-least-once sources (message id / file checksum set). */
  declare idempotencyKey: string | null;
  declare startedAt: Date | null;
  declare finishedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class StageExecution extends Model<InferAttributes<StageExecution>, InferCreationAttributes<StageExecution>> {
  declare id: CreationOptional<number>;
  declare runId: number | null;
  declare submissionId: number | null;
  declare organizationId: number | null;
  declare stageKey: string;
  declare attempt: number;
  /** 'completed' | 'failed' | 'skipped' | 'running'. */
  declare status: string;
  declare inputArtifactId: number | null;
  declare outputArtifactId: number | null;
  declare provider: string | null;
  declare providerVersion: string | null;
  declare durationMs: number | null;
  declare startedAt: Date | null;
  declare finishedAt: Date | null;
  declare errorMessage: string | null;
  declare metadata: Record<string, unknown> | null;
  declare createdAt: CreationOptional<Date>;
}

export class PipelineArtifact extends Model<InferAttributes<PipelineArtifact>, InferCreationAttributes<PipelineArtifact>> {
  declare id: CreationOptional<number>;
  declare runId: number | null;
  declare submissionId: number | null;
  declare organizationId: number | null;
  declare stageKey: string;
  /** 'input' | 'output'. */
  declare role: string;
  /** sha256 of the canonical JSON payload — identical payloads share a hash. */
  declare contentHash: string | null;
  declare mediaType: string | null;
  declare payload: Record<string, unknown> | null;
  /** Internal execution payload; never returned from the audit API. */
  declare privatePayload: Record<string, unknown> | null;
  declare sizeBytes: number | null;
  declare createdAt: CreationOptional<Date>;
}

/**
 * Durable work item for automatically advancing an inbound submission.  This is
 * intentionally separate from PipelineRun: a run is audit history, while a job
 * is operational state that may be retried after a process restart.
 */
export class PipelineJob extends Model<InferAttributes<PipelineJob>, InferCreationAttributes<PipelineJob>> {
  declare id: CreationOptional<number>;
  declare submissionId: number;
  declare organizationId: number;
  declare status: string;
  /** Failed stage to rerun before the job may advance again. */
  declare stageKey: string | null;
  declare attemptCount: number;
  declare maxAttempts: number;
  declare nextRunAt: Date | null;
  declare lockedAt: Date | null;
  declare lockedBy: string | null;
  declare lastError: string | null;
  declare completedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

/**
 * One LLM agent call made during a stage execution: the exact prompt sent and
 * the raw model text received. This is the transcript the pipeline UI renders
 * so a reviewer can verify what the agent was asked and what it answered —
 * the parsed/validated result lives in the stage's output artifact; this row
 * preserves the conversation that produced it. Append-only, like executions.
 */
export class AgentTrace extends Model<InferAttributes<AgentTrace>, InferCreationAttributes<AgentTrace>> {
  declare id: CreationOptional<number>;
  declare runId: number | null;
  declare executionId: number | null;
  declare submissionId: number | null;
  declare organizationId: number | null;
  declare stageKey: string;
  /** 1-based order of the call within its stage execution. */
  declare seq: number;
  /** Which agent made the call, e.g. 'lob_classification', 'extraction'. */
  declare agent: string;
  declare model: string | null;
  declare promptVersion: string | null;
  declare prompt: string | null;
  declare responseText: string | null;
  /** 'completed' | 'failed'. */
  declare status: string;
  declare errorMessage: string | null;
  declare durationMs: number | null;
  declare startedAt: Date | null;
  declare finishedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
}

export function initPipelineModels(sequelize: Sequelize): void {
  PipelineRun.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      submissionId: { type: DataTypes.INTEGER, allowNull: false },
      organizationId: { type: DataTypes.INTEGER, allowNull: true, field: 'organization_id' },
      trigger: { type: DataTypes.STRING, allowNull: true },
      triggeredByUserId: { type: DataTypes.INTEGER, allowNull: true },
      parentRunId: { type: DataTypes.INTEGER, allowNull: true },
      fromStage: { type: DataTypes.STRING, allowNull: true },
      toStage: { type: DataTypes.STRING, allowNull: true },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'running' },
      idempotencyKey: { type: DataTypes.STRING, allowNull: true },
      startedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
      finishedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { sequelize, modelName: 'PipelineRun', tableName: 'pipeline_runs', underscored: true },
  );

  StageExecution.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      runId: { type: DataTypes.INTEGER, allowNull: true },
      submissionId: { type: DataTypes.INTEGER, allowNull: false },
      organizationId: { type: DataTypes.INTEGER, allowNull: true, field: 'organization_id' },
      stageKey: { type: DataTypes.STRING, allowNull: false },
      attempt: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'completed' },
      inputArtifactId: { type: DataTypes.INTEGER, allowNull: true },
      outputArtifactId: { type: DataTypes.INTEGER, allowNull: true },
      provider: { type: DataTypes.STRING, allowNull: true },
      providerVersion: { type: DataTypes.STRING, allowNull: true },
      durationMs: { type: DataTypes.INTEGER, allowNull: true },
      startedAt: { type: DataTypes.DATE, allowNull: true },
      finishedAt: { type: DataTypes.DATE, allowNull: true },
      errorMessage: { type: DataTypes.TEXT, allowNull: true },
      metadata: { type: DataTypes.JSONB, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    } as any,
    {
      sequelize,
      modelName: 'StageExecution',
      tableName: 'stage_executions',
      underscored: true,
      updatedAt: false,
    },
  );

  PipelineArtifact.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      runId: { type: DataTypes.INTEGER, allowNull: true },
      submissionId: { type: DataTypes.INTEGER, allowNull: false },
      organizationId: { type: DataTypes.INTEGER, allowNull: true, field: 'organization_id' },
      stageKey: { type: DataTypes.STRING, allowNull: false },
      role: { type: DataTypes.STRING, allowNull: false },
      contentHash: { type: DataTypes.STRING, allowNull: true },
      mediaType: { type: DataTypes.STRING, allowNull: true, defaultValue: 'application/json' },
      payload: { type: DataTypes.JSONB, allowNull: true },
      privatePayload: { type: DataTypes.JSONB, allowNull: true, field: 'private_payload' },
      sizeBytes: { type: DataTypes.INTEGER, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    } as any,
    {
      sequelize,
      modelName: 'PipelineArtifact',
      tableName: 'pipeline_artifacts',
      underscored: true,
      updatedAt: false,
    },
  );

  PipelineJob.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      submissionId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      organizationId: { type: DataTypes.INTEGER, allowNull: false, field: 'organization_id' },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'queued' },
      stageKey: { type: DataTypes.STRING, allowNull: true, field: 'stage_key' },
      attemptCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      maxAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
      nextRunAt: { type: DataTypes.DATE, allowNull: true, field: 'next_run_at' },
      lockedAt: { type: DataTypes.DATE, allowNull: true, field: 'locked_at' },
      lockedBy: { type: DataTypes.STRING, allowNull: true, field: 'locked_by' },
      lastError: { type: DataTypes.TEXT, allowNull: true, field: 'last_error' },
      completedAt: { type: DataTypes.DATE, allowNull: true, field: 'completed_at' },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { sequelize, modelName: 'PipelineJob', tableName: 'pipeline_jobs', underscored: true },
  );

  AgentTrace.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      runId: { type: DataTypes.INTEGER, allowNull: true },
      executionId: { type: DataTypes.INTEGER, allowNull: true },
      submissionId: { type: DataTypes.INTEGER, allowNull: true },
      organizationId: { type: DataTypes.INTEGER, allowNull: true, field: 'organization_id' },
      stageKey: { type: DataTypes.STRING, allowNull: false },
      seq: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      agent: { type: DataTypes.STRING, allowNull: false },
      model: { type: DataTypes.STRING, allowNull: true },
      promptVersion: { type: DataTypes.STRING, allowNull: true },
      prompt: { type: DataTypes.TEXT, allowNull: true },
      responseText: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'completed' },
      errorMessage: { type: DataTypes.TEXT, allowNull: true },
      durationMs: { type: DataTypes.INTEGER, allowNull: true },
      startedAt: { type: DataTypes.DATE, allowNull: true },
      finishedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    } as any,
    {
      sequelize,
      modelName: 'AgentTrace',
      tableName: 'agent_traces',
      underscored: true,
      updatedAt: false,
    },
  );
}
