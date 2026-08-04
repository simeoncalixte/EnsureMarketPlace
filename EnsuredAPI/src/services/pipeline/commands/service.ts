import { Submission, IngestionEvent } from '../../../db/models';
import { getSequelize } from '../../../db/config/database';
import type { Transaction } from 'sequelize';
import { prepareStageRun, recordAgentTraces, recordStageRun } from '../playback/service';
import { createAgentTraceCapture } from '../agents/trace';
import { extractStageSignals } from '../board/stageSignals';
import { nextStageKeyInRoute, prevStageKeyInRoute } from '../routing/routes';
import { resolveSubmissionRoute } from '../routing/resolveRoute';
import {
  PipelineStageDefinition,
  resolveStageKey,
  stageForKey,
  stageKeyForEvent,
} from '../stages/registry';
import { createStageExecutors, StageExecutor } from '../stages/executor';

export type AdvanceSubmissionResult = {
  ok: boolean;
  submissionId: number;
  fromStage: string;
  fromStageLabel: string;
  toStage: string;
  toStageLabel: string;
  eventStatus: 'ok' | 'failed';
  error: string | null;
  warnings: string[];
  runId: number | null;
  routeKey: string | null;
};

export type AdvanceSubmissionError = { error: string; code: number };
type PipelineTrigger = 'manual' | 'rerun' | 'automatic';

export class PipelineCommandService {
  constructor(private readonly executors: Readonly<Record<string, StageExecutor>> = createStageExecutors()) {}

  async advance(
    submissionId: number,
    context: { organizationId: number; userId: number | null },
    opts: { trigger?: Extract<PipelineTrigger, 'manual' | 'automatic'> } = {},
  ): Promise<AdvanceSubmissionResult | AdvanceSubmissionError> {
    return getSequelize().transaction(async (transaction) => {
      const submission = await this.lockSubmission(submissionId, context.organizationId, transaction);
      if (!submission) return { error: 'submission_not_found', code: 404 };

      const latest = await latestEventFor(submissionId, transaction);
      const currentKey = resolveStageKey(latest?.stage, String(submission.status));
      const route = await resolveSubmissionRoute({ id: submission.id, organizationId: submission.organizationId });
      const nextKey = nextStageKeyInRoute(route.keys, currentKey);
      const fromStage = stageForKey(currentKey) ?? stageForKey('ingestion')!;
      const targetStage = nextKey ? stageForKey(nextKey) : null;
      if (!targetStage) return { error: 'already_at_final_stage', code: 400 };
      return this.executeTransition(
        submission,
        fromStage,
        targetStage,
        opts.trigger ?? 'manual',
        route.routeKey,
        targetStage.key === route.keys[route.keys.length - 1],
        transaction,
        context.userId,
      );
    });
  }

  async rerun(
    submissionId: number,
    context: { organizationId: number; userId: number | null },
    opts: { stageKey?: string; trigger?: Extract<PipelineTrigger, 'rerun' | 'automatic'> } = {},
  ): Promise<AdvanceSubmissionResult | AdvanceSubmissionError> {
    return getSequelize().transaction(async (transaction) => {
      const submission = await this.lockSubmission(submissionId, context.organizationId, transaction);
      if (!submission) return { error: 'submission_not_found', code: 404 };

      const latest = await latestEventFor(submissionId, transaction);
      const targetKey = opts.stageKey
        ? (stageKeyForEvent(opts.stageKey) ?? opts.stageKey)
        : resolveStageKey(latest?.stage, String(submission.status));
      const targetStage = stageForKey(targetKey);
      if (!targetStage) return { error: 'unknown_stage', code: 400 };
      if (!targetStage.executable || !this.executors[targetStage.key]) return { error: 'stage_not_rerunnable', code: 400 };

      const route = await resolveSubmissionRoute({ id: submission.id, organizationId: submission.organizationId });
      const fromStage = stageForKey(prevStageKeyInRoute(route.keys, targetStage.key)) ?? targetStage;
      return this.executeTransition(
        submission,
        fromStage,
        targetStage,
        opts.trigger ?? 'rerun',
        route.routeKey,
        targetStage.key === route.keys[route.keys.length - 1],
        transaction,
        context.userId,
      );
    });
  }

  private lockSubmission(submissionId: number, organizationId: number, transaction: Transaction): Promise<Submission | null> {
    return Submission.findOne({ where: { id: submissionId, organizationId }, transaction, lock: transaction.LOCK.UPDATE });
  }

  private async executeTransition(
    submission: Submission,
    fromStage: PipelineStageDefinition,
    targetStage: PipelineStageDefinition,
    trigger: PipelineTrigger,
    routeKey: string | null,
    isFinalStage: boolean,
    transaction: Transaction,
    userId: number | null,
  ): Promise<AdvanceSubmissionResult> {
    const prepared = await prepareStageRun({
      submissionId: submission.id,
      organizationId: submission.organizationId ?? null,
      fromStageKey: fromStage.key,
      toStageKey: targetStage.key,
      trigger,
      triggeredByUserId: userId,
      transaction,
    });

    const inputPayload: Record<string, unknown> = {
      submission: { id: submission.id, organizationId: submission.organizationId },
      ...prepared.priorOutputs,
    };
    const traceCapture = createAgentTraceCapture({ submissionId: submission.id, stageKey: targetStage.key });
    const startedAt = new Date();
    let result: Record<string, unknown> | undefined;
    let errorMessage: string | null = null;
    let warnings: string[] = [];
    let signals: Record<string, unknown> = {};
    let ranOk = true;
    const executor = this.executors[targetStage.key];

    if (!executor) {
      ranOk = false;
      errorMessage = `No executor registered for ${targetStage.key}`;
    } else {
      try {
        result = await traceCapture.run(() => executor(inputPayload));
        const rawWarnings = result.warnings;
        if (Array.isArray(rawWarnings)) warnings = rawWarnings.map((warning) => String(warning)).filter(Boolean);
        signals = extractStageSignals(result);
        if (result.ok === false) {
          ranOk = false;
          errorMessage = String(result.error ?? 'stage reported failure');
        }
      } catch (err) {
        ranOk = false;
        errorMessage = err instanceof Error ? err.message : String(err);
      }
    }
    const finishedAt = new Date();

    let runId: number | null = null;
    let inputRef: string | null = null;
    let outputRef: string | null = null;
    {
        const recorded = await recordStageRun({
          run: prepared.run,
          submissionId: submission.id,
          organizationId: submission.organizationId ?? null,
          stageKey: targetStage.key,
          isFinalStage,
          status: ranOk ? 'completed' : 'failed',
          inputPayload,
          outputPayload: result ?? { ok: ranOk, error: errorMessage },
          provider: result && typeof result.provider === 'string' ? result.provider : null,
          startedAt,
          finishedAt,
          errorMessage,
          metadata: signals,
          transaction,
        });
        runId = recorded.runId;
        inputRef = String(recorded.inputArtifactId);
        outputRef = String(recorded.outputArtifactId);
        await recordAgentTraces({
          runId: recorded.runId,
          executionId: recorded.executionId,
          submissionId: submission.id,
          organizationId: submission.organizationId ?? null,
          stageKey: targetStage.key,
          traces: traceCapture.traces,
          transaction,
        });
    }

    await IngestionEvent.create({
      submissionId: submission.id,
      organizationId: submission.organizationId ?? null,
      stage: targetStage.key,
      status: ranOk ? 'completed' : 'failed',
      inputRef,
      outputRef,
      errorMessage,
      metadata: { trigger, runId, ...(routeKey ? { route: routeKey } : {}), ...(warnings.length ? { warnings } : {}), ...signals },
    } as never, { transaction });

    return {
      ok: ranOk,
      submissionId: submission.id,
      fromStage: fromStage.key,
      fromStageLabel: fromStage.label,
      toStage: targetStage.key,
      toStageLabel: targetStage.label,
      eventStatus: ranOk ? 'ok' : 'failed',
      error: errorMessage,
      warnings,
      runId,
      routeKey,
    };
  }
}

async function latestEventFor(submissionId: number, transaction?: Transaction): Promise<IngestionEvent | null> {
  return IngestionEvent.findOne({
    attributes: ['id', 'submissionId', 'stage', 'status', 'errorMessage', 'createdAt'],
    where: { submissionId },
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
    transaction,
  });
}
