import { Op } from 'sequelize';
import { PipelineJob } from '../../../db/models';
import { getSequelize } from '../../../db/config/database';
import { PipelineCommandService } from '../commands/service';

const DEFAULT_MAX_ATTEMPTS = 3;
const MAX_STAGE_TRANSITIONS_PER_DRAIN = 100;
const STALE_LOCK_MS = 15 * 60_000;

export type PipelineOrchestratorDeps = {
  commands?: Pick<PipelineCommandService, 'advance' | 'rerun'>;
  now?: () => Date;
  workerId?: string;
};

/**
 * Durable, restart-safe driver for inbound submissions. A job advances exactly
 * one stage at a time through PipelineCommandService, so normal artifacts,
 * IngestionEvents, routing and replay history remain the source of truth.
 */
export class PipelineOrchestrator {
  private readonly commands: Pick<PipelineCommandService, 'advance' | 'rerun'>;
  private readonly now: () => Date;
  private readonly workerId: string;
  private draining: Promise<void> | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(deps: PipelineOrchestratorDeps = {}) {
    this.commands = deps.commands ?? new PipelineCommandService();
    this.now = deps.now ?? (() => new Date());
    this.workerId = deps.workerId ?? `pipeline-${process.pid}`;
  }

  async enqueue(args: { submissionId: number; organizationId: number | null }): Promise<void> {
    if (process.env.PIPELINE_AUTORUN_ENABLED === 'false') return;
    if (!(args.submissionId > 0) || !(args.organizationId && args.organizationId > 0)) {
      // Intake remains durable even when a legacy channel has no owning org. It
      // cannot safely be processed, because commands enforce org isolation.
      console.warn(`pipeline orchestrator: submission ${args.submissionId} was not queued because it has no organization`);
      return;
    }
    try {
      await PipelineJob.findOrCreate({
        where: { submissionId: args.submissionId },
        defaults: {
          submissionId: args.submissionId,
          organizationId: args.organizationId,
          status: 'queued',
          stageKey: null,
          attemptCount: 0,
          maxAttempts: DEFAULT_MAX_ATTEMPTS,
          nextRunAt: this.now(),
          lockedAt: null,
          lockedBy: null,
          lastError: null,
          completedAt: null,
        },
      });
      this.wake();
    } catch (err) {
      // Do not turn a successful intake into a connector retry/DLQ just because
      // the worker table is temporarily unavailable. A boot-time drain recovers
      // queued jobs once the database is healthy.
      console.error('pipeline orchestrator: failed to enqueue submission', args.submissionId, err);
    }
  }

  start(intervalMs = Number(process.env.PIPELINE_ORCHESTRATOR_POLL_MS ?? 1_000)): void {
    if (this.timer || process.env.PIPELINE_AUTORUN_ENABLED === 'false') return;
    this.timer = setInterval(() => this.wake(), Math.max(250, intervalMs));
    this.timer.unref?.();
    void this.recoverStaleJobs().finally(() => this.wake());
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  wake(): Promise<void> {
    if (!this.draining) {
      this.draining = this.drain().finally(() => { this.draining = null; });
    }
    return this.draining;
  }

  private async drain(): Promise<void> {
    for (let count = 0; count < MAX_STAGE_TRANSITIONS_PER_DRAIN; count += 1) {
      const job = await this.claimNext();
      if (!job) return;
      await this.runClaimedJob(job);
    }
    // Yield after a bounded batch so a pathological submission cannot monopolize
    // the event loop; the next poll (or enqueue) continues it.
    setImmediate(() => this.wake());
  }

  private async claimNext(): Promise<PipelineJob | null> {
    return getSequelize().transaction(async (transaction) => {
      const job = await PipelineJob.findOne({
        where: {
          status: 'queued',
          [Op.or]: [{ nextRunAt: null }, { nextRunAt: { [Op.lte]: this.now() } }],
        },
        order: [['nextRunAt', 'ASC'], ['id', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
        skipLocked: true,
      });
      if (!job) return null;
      job.status = 'running';
      job.lockedAt = this.now();
      job.lockedBy = this.workerId;
      await job.save({ transaction });
      return job;
    });
  }

  /** Recover a job abandoned by a crashed worker after its execution lease expires. */
  private async recoverStaleJobs(): Promise<void> {
    const staleBefore = new Date(this.now().getTime() - STALE_LOCK_MS);
    await PipelineJob.update(
      { status: 'queued', lockedAt: null, lockedBy: null },
      {
        where: {
          status: 'running',
          [Op.or]: [{ lockedAt: null }, { lockedAt: { [Op.lte]: staleBefore } }],
        },
      },
    );
  }

  private async runClaimedJob(job: PipelineJob): Promise<void> {
    const context = { organizationId: job.organizationId, userId: null };
    try {
      const result = job.stageKey
        ? await this.commands.rerun(job.submissionId, context, { stageKey: job.stageKey, trigger: 'automatic' })
        : await this.commands.advance(job.submissionId, context, { trigger: 'automatic' });

      if ('code' in result) {
        if (result.error === 'already_at_final_stage') {
          await this.complete(job);
          return;
        }
        await this.retry(job, result.error, job.stageKey);
        return;
      }
      if (!result.ok) {
        await this.retry(job, result.error ?? 'stage reported failure', result.toStage);
        return;
      }

      // A successful stage is immediately eligible for the next stage. Persisting
      // the cleared retry key prevents a restarted worker from replaying it.
      await job.update({
        status: 'queued',
        stageKey: null,
        attemptCount: 0,
        nextRunAt: this.now(),
        lockedAt: null,
        lockedBy: null,
        lastError: null,
      });
    } catch (err) {
      await this.retry(job, err instanceof Error ? err.message : String(err), job.stageKey);
    }
  }

  private async complete(job: PipelineJob): Promise<void> {
    await job.update({
      status: 'completed',
      stageKey: null,
      nextRunAt: null,
      lockedAt: null,
      lockedBy: null,
      lastError: null,
      completedAt: this.now(),
    });
  }

  private async retry(job: PipelineJob, error: string, stageKey: string | null): Promise<void> {
    const attemptCount = job.attemptCount + 1;
    if (attemptCount >= job.maxAttempts) {
      await job.update({
        status: 'failed',
        stageKey,
        attemptCount,
        nextRunAt: null,
        lockedAt: null,
        lockedBy: null,
        lastError: error,
      });
      return;
    }
    const delayMs = Math.min(60_000, 1_000 * (2 ** (attemptCount - 1)));
    await job.update({
      status: 'queued',
      stageKey,
      attemptCount,
      nextRunAt: new Date(this.now().getTime() + delayMs),
      lockedAt: null,
      lockedBy: null,
      lastError: error,
    });
  }
}

let singleton: PipelineOrchestrator | null = null;

export function getPipelineOrchestrator(): PipelineOrchestrator {
  singleton ??= new PipelineOrchestrator();
  return singleton;
}
