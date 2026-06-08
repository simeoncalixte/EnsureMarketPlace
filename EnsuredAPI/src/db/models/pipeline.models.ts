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
  declare tenantId: number | null;
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
  declare tenantId: number | null;
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
  declare tenantId: number | null;
  declare stageKey: string;
  /** 'input' | 'output'. */
  declare role: string;
  /** sha256 of the canonical JSON payload — identical payloads share a hash. */
  declare contentHash: string | null;
  declare mediaType: string | null;
  declare payload: Record<string, unknown> | null;
  declare sizeBytes: number | null;
  declare createdAt: CreationOptional<Date>;
}

export function initPipelineModels(sequelize: Sequelize): void {
  PipelineRun.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      submissionId: { type: DataTypes.INTEGER, allowNull: true },
      tenantId: { type: DataTypes.INTEGER, allowNull: true },
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
      submissionId: { type: DataTypes.INTEGER, allowNull: true },
      tenantId: { type: DataTypes.INTEGER, allowNull: true },
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
      submissionId: { type: DataTypes.INTEGER, allowNull: true },
      tenantId: { type: DataTypes.INTEGER, allowNull: true },
      stageKey: { type: DataTypes.STRING, allowNull: false },
      role: { type: DataTypes.STRING, allowNull: false },
      contentHash: { type: DataTypes.STRING, allowNull: true },
      mediaType: { type: DataTypes.STRING, allowNull: true, defaultValue: 'application/json' },
      payload: { type: DataTypes.JSONB, allowNull: true },
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
}
