import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import type { Transaction } from 'sequelize';
import { AgentTrace, PipelineArtifact, PipelineRun, StageExecution, Submission } from '../../../db/models';
import { liveAgentCalls, type AgentCallTrace } from '../agents/trace';

/**
 * Playback service — records and reads the pipeline's replayable history.
 *
 * The board's stage-advance calls {@link prepareStageRun} before running a stage
 * (to open/reuse a run and assemble the stage's input from prior outputs) and
 * {@link recordStageRun} after (to persist the input/output artifacts and the
 * execution). {@link getSubmissionPlayback} / {@link getArtifact} back the
 * playback endpoints, and {@link seedPipelineRunForSubmission} lets the seeders
 * emit believable historical runs so the timeline has something to show.
 *
 * Everything here is best-effort at the call sites: if these tables are missing
 * (migration not yet run) the capture is skipped and the core pipeline still
 * advances — playback is additive, never load-bearing.
 */

export interface PreparedStageRun {
  run: PipelineRun;
  /** Prior stage outputs for this run, keyed by stage (e.g. `{ ocr, extraction }`). */
  priorOutputs: Record<string, unknown>;
}

function hashPayload(value: unknown): { json: string; contentHash: string; sizeBytes: number } {
  const json = JSON.stringify(value ?? null);
  const contentHash = createHash('sha256').update(json).digest('hex');
  return { json, contentHash, sizeBytes: Buffer.byteLength(json, 'utf8') };
}

/** Store structure and deterministic fingerprints in the audit log, not PII. */
function safeArtifactPayload(value: unknown): unknown {
  if (process.env.PIPELINE_STORE_RAW_ARTIFACTS === 'true') return value;
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return `[redacted sha256=${createHash('sha256').update(value).digest('hex')} chars=${value.length}]`;
  }
  if (Array.isArray(value)) return value.map(safeArtifactPayload);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, safeArtifactPayload(item)]));
  }
  return String(value);
}

type EncryptedPayload = { _encrypted: true; iv: string; tag: string; ciphertext: string };

function artifactEncryptionKey(): Buffer {
  const configured = process.env.PIPELINE_ARTIFACT_ENCRYPTION_KEY;
  if (!configured && process.env.NODE_ENV === 'production') {
    throw new Error('PIPELINE_ARTIFACT_ENCRYPTION_KEY is required in production');
  }
  // Development-only fallback keeps local/test replay working; production must
  // supply an independent secret above.
  return createHash('sha256').update(configured ?? process.env.JWT_SECRET ?? 'development-only-artifact-key').digest();
}

function encryptPrivatePayload(value: unknown): EncryptedPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', artifactEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value ?? null), 'utf8'), cipher.final()]);
  return { _encrypted: true, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
}

function decryptPrivatePayload(value: Record<string, unknown> | null): unknown {
  if (!value || value._encrypted !== true) return value;
  const encrypted = value as unknown as EncryptedPayload;
  const decipher = createDecipheriv('aes-256-gcm', artifactEncryptionKey(), Buffer.from(encrypted.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(encrypted.tag, 'base64'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(encrypted.ciphertext, 'base64')), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8'));
}

async function createArtifact(
  attrs: {
    runId: number;
    submissionId: number | null;
    organizationId: number | null;
    stageKey: string;
    role: 'input' | 'output';
    payload: Record<string, unknown> | unknown;
  },
  transaction?: Transaction,
): Promise<PipelineArtifact> {
  const safePayload = safeArtifactPayload(attrs.payload);
  const { contentHash, sizeBytes } = hashPayload(safePayload);
  return PipelineArtifact.create(
    {
      runId: attrs.runId,
      submissionId: attrs.submissionId,
      organizationId: attrs.organizationId,
      stageKey: attrs.stageKey,
      role: attrs.role,
      contentHash,
      mediaType: 'application/json',
      payload: (safePayload ?? null) as Record<string, unknown> | null,
      privatePayload: encryptPrivatePayload(attrs.payload) as unknown as Record<string, unknown>,
      sizeBytes,
    } as never,
    { transaction },
  );
}

/**
 * Load the submission's latest recorded output per stage across ALL of its runs
 * (artifact order, so newer runs win). Without this, a stage rerun after the
 * original run closed would execute against an empty history — the bare
 * submission instead of the priors it saw the first time.
 */
async function loadLatestStageOutputs(submissionId: number, transaction?: Transaction): Promise<Record<string, unknown>> {
  const outputs = await PipelineArtifact.findAll({
    where: { submissionId, role: 'output' },
    order: [['id', 'ASC']],
    transaction,
  });
  const byStage: Record<string, unknown> = {};
  for (const artifact of outputs) {
    byStage[artifact.stageKey] = decryptPrivatePayload(artifact.privatePayload) ?? artifact.payload;
  }
  return byStage;
}

/**
 * Open (or reuse) the active run for a submission and return the prior stage
 * outputs so the caller can thread them into the next stage's input. A run stays
 * `running` across advances and is closed by {@link recordStageRun} at the final
 * stage; replays create their own run via {@link seedPipelineRunForSubmission} or
 * an explicit replay (future).
 */
export async function prepareStageRun(args: {
  submissionId: number;
  organizationId: number | null;
  fromStageKey: string;
  toStageKey: string;
  trigger?: string;
  triggeredByUserId?: number | null;
  transaction?: Transaction;
}): Promise<PreparedStageRun> {
  let run = await PipelineRun.findOne({
    where: { submissionId: args.submissionId, status: 'running' },
    order: [['id', 'DESC']],
    transaction: args.transaction,
    lock: args.transaction?.LOCK.UPDATE,
  });
  if (!run) {
    // A new run after a previous one closed (e.g. a rerun) is chained to that
    // run so it inherits the recorded stage outputs instead of starting empty.
    const latest = await PipelineRun.findOne({
      where: { submissionId: args.submissionId },
      order: [['id', 'DESC']],
      transaction: args.transaction,
      lock: args.transaction?.LOCK.UPDATE,
    });
    run = await PipelineRun.create({
      submissionId: args.submissionId,
      organizationId: args.organizationId,
      trigger: args.trigger ?? 'manual',
      triggeredByUserId: args.triggeredByUserId ?? null,
      parentRunId: latest?.id ?? null,
      fromStage: args.fromStageKey,
      toStage: args.toStageKey,
      status: 'running',
      startedAt: new Date(),
    }, { transaction: args.transaction });
  }
  const priorOutputs = await loadLatestStageOutputs(args.submissionId, args.transaction);
  return { run, priorOutputs };
}

/**
 * Persist a stage's input + output artifacts and its execution record, advancing
 * the run (and closing it once the final stage completes).
 */
export async function recordStageRun(args: {
  run: PipelineRun;
  submissionId: number;
  organizationId: number | null;
  stageKey: string;
  isFinalStage: boolean;
  status: 'completed' | 'failed';
  inputPayload: unknown;
  outputPayload: unknown;
  provider?: string | null;
  startedAt: Date;
  finishedAt: Date;
  errorMessage?: string | null;
  /** Quick-query scalar signals projected from the stage result (e.g. templatePersisted). */
  metadata?: Record<string, unknown> | null;
  transaction?: Transaction;
}): Promise<{ runId: number; inputArtifactId: number; outputArtifactId: number; executionId: number }> {
  const { run } = args;
  const inputArtifact = await createArtifact({
    runId: run.id,
    submissionId: args.submissionId,
    organizationId: args.organizationId,
    stageKey: args.stageKey,
    role: 'input',
    payload: args.inputPayload,
  }, args.transaction);
  const outputArtifact = await createArtifact({
    runId: run.id,
    submissionId: args.submissionId,
    organizationId: args.organizationId,
    stageKey: args.stageKey,
    role: 'output',
    payload: args.outputPayload,
  }, args.transaction);

  const attempt = (await StageExecution.count({ where: { runId: run.id, stageKey: args.stageKey }, transaction: args.transaction })) + 1;
  const execution = await StageExecution.create({
    runId: run.id,
    submissionId: args.submissionId,
    organizationId: args.organizationId,
    stageKey: args.stageKey,
    attempt,
    status: args.status,
    inputArtifactId: inputArtifact.id,
    outputArtifactId: outputArtifact.id,
    provider: args.provider ?? null,
    providerVersion: null,
    durationMs: Math.max(0, args.finishedAt.getTime() - args.startedAt.getTime()),
    startedAt: args.startedAt,
    finishedAt: args.finishedAt,
    errorMessage: args.errorMessage ?? null,
    metadata: args.metadata && Object.keys(args.metadata).length > 0 ? args.metadata : null,
  } as never, { transaction: args.transaction });

  // Advance the run pointer; close it only when the final stage completes. A
  // failure leaves the run `running` so the next advance retries within it.
  run.toStage = args.stageKey;
  if (args.isFinalStage && args.status === 'completed') {
    run.status = 'completed';
    run.finishedAt = new Date();
  }
  await run.save({ transaction: args.transaction });

  return {
    runId: run.id,
    inputArtifactId: inputArtifact.id,
    outputArtifactId: outputArtifact.id,
    executionId: execution.id,
  };
}

/**
 * Persist the LLM agent calls captured during a stage run (see
 * `agents/trace.ts`) as `agent_traces` rows linked to the execution. Like the
 * artifact capture, this is best-effort at the call site — a missing table must
 * never block the pipeline.
 */
export async function recordAgentTraces(args: {
  runId: number | null;
  executionId: number | null;
  submissionId: number;
  organizationId: number | null;
  stageKey: string;
  traces: AgentCallTrace[];
  transaction?: Transaction;
}): Promise<void> {
  if (args.traces.length === 0) return;
  await AgentTrace.bulkCreate(
    args.traces.map((trace) => ({
      runId: args.runId,
      executionId: args.executionId,
      submissionId: args.submissionId,
      organizationId: args.organizationId,
      stageKey: args.stageKey,
      seq: trace.seq,
      agent: trace.agent,
      model: trace.model,
      promptVersion: trace.promptVersion,
      prompt: trace.prompt,
      responseText: trace.responseText,
      // A capture interrupted mid-call (process crash aside, a thrown stage)
      // can leave 'running' entries; persist them as failed for honesty.
      status: trace.status === 'completed' ? 'completed' : 'failed',
      errorMessage: trace.errorMessage,
      durationMs: trace.durationMs,
      startedAt: trace.startedAt,
      finishedAt: trace.finishedAt,
    })) as never[],
    { transaction: args.transaction },
  );
}

// ---------------------------------------------------------------------------
// Read APIs (playback endpoints)
// ---------------------------------------------------------------------------

/** The wire shape of one agent call in the activity endpoint. */
type AgentActivityCall = {
  id: number | null;
  runId: number | null;
  executionId: number | null;
  stageKey: string | null;
  seq: number;
  agent: string;
  model: string | null;
  promptVersion: string | null;
  prompt: string | null;
  responseText: string | null;
  status: string;
  errorMessage: string | null;
  durationMs: number | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  /** True for calls still mirrored from an in-flight stage (not yet persisted). */
  live: boolean;
};

/**
 * The full agent transcript for a submission: every persisted LLM call across
 * its runs, plus the calls of any stage currently in flight (mirrored from the
 * live capture registry, so the UI can show "the agent is thinking" while a
 * stage runs). Ordered oldest → newest.
 */
export async function getSubmissionAgentActivity(submissionId: number, organizationId: number): Promise<{
  submissionId: number;
  calls: AgentActivityCall[];
  /** True while at least one call is still running. */
  active: boolean;
}> {
  const submission = await Submission.findOne({ where: { id: submissionId, organizationId }, attributes: ['id'] });
  if (!submission) return { submissionId, calls: [], active: false };
  let persisted: AgentTrace[] = [];
  try {
    persisted = await AgentTrace.findAll({ where: { submissionId, organizationId }, order: [['id', 'ASC']] });
  } catch {
    // Table missing (migration not run) — degrade to live-only activity.
  }

  const calls: AgentActivityCall[] = persisted.map((trace) => ({
    id: trace.id,
    runId: trace.runId,
    executionId: trace.executionId,
    stageKey: trace.stageKey,
    seq: trace.seq,
    agent: trace.agent,
    model: trace.model,
    promptVersion: trace.promptVersion,
    prompt: trace.prompt,
    responseText: trace.responseText,
    status: trace.status,
    errorMessage: trace.errorMessage,
    durationMs: trace.durationMs,
    startedAt: trace.startedAt,
    finishedAt: trace.finishedAt,
    live: false,
  }));

  for (const call of liveAgentCalls(submissionId)) {
    calls.push({
      id: null,
      runId: null,
      executionId: null,
      stageKey: call.stageKey,
      seq: call.seq,
      agent: call.agent,
      model: call.model,
      promptVersion: call.promptVersion,
      prompt: call.prompt,
      responseText: call.responseText,
      status: call.status,
      errorMessage: call.errorMessage,
      durationMs: call.durationMs,
      startedAt: call.startedAt,
      finishedAt: call.finishedAt,
      live: true,
    });
  }

  return {
    submissionId,
    calls,
    active: calls.some((call) => call.status === 'running'),
  };
}

export async function getSubmissionPlayback(submissionId: number, organizationId: number): Promise<{
  submissionId: number;
  runCount: number;
  runs: Array<Record<string, unknown>>;
}> {
  const runs = await PipelineRun.findAll({ where: { submissionId, organizationId }, order: [['id', 'ASC']] });
  const runIds = runs.map((r) => r.id);

  const executions = runIds.length
    ? await StageExecution.findAll({ where: { runId: runIds }, order: [['id', 'ASC']] })
    : [];
  // Artifact *summaries* only (payloads are fetched on demand via getArtifact).
  const artifacts = runIds.length
    ? await PipelineArtifact.findAll({
        where: { runId: runIds },
        attributes: { exclude: ['payload'] },
        order: [['id', 'ASC']],
      })
    : [];

  return {
    submissionId,
    runCount: runs.length,
    runs: runs.map((run) => ({
      id: run.id,
      trigger: run.trigger,
      status: run.status,
      parentRunId: run.parentRunId,
      fromStage: run.fromStage,
      toStage: run.toStage,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      executions: executions
        .filter((e) => e.runId === run.id)
        .map((e) => ({
          id: e.id,
          stageKey: e.stageKey,
          attempt: e.attempt,
          status: e.status,
          provider: e.provider,
          durationMs: e.durationMs,
          startedAt: e.startedAt,
          finishedAt: e.finishedAt,
          errorMessage: e.errorMessage,
          inputArtifactId: e.inputArtifactId,
          outputArtifactId: e.outputArtifactId,
        })),
      artifacts: artifacts
        .filter((a) => a.runId === run.id)
        .map((a) => ({
          id: a.id,
          stageKey: a.stageKey,
          role: a.role,
          contentHash: a.contentHash,
          mediaType: a.mediaType,
          sizeBytes: a.sizeBytes,
          createdAt: a.createdAt,
        })),
    })),
  };
}

export async function getArtifact(artifactId: number, organizationId: number): Promise<PipelineArtifact | null> {
  return PipelineArtifact.findOne({ where: { id: artifactId, organizationId } });
}

// ---------------------------------------------------------------------------
// Seeder support — emit believable historical runs
// ---------------------------------------------------------------------------

export interface SeedStageSpec {
  stageKey: string;
  output: Record<string, unknown>;
}

/**
 * Build synthetic per-stage outputs for the stages a submission has already
 * passed (up to and including `throughStageKey`), derived from its document
 * manifest — so a seeded "completed" run reads like a real one.
 */
export function syntheticStageOutputs(
  input: {
    lineOfBusinessCode: string | null;
    summaryText: string;
    structuredData: Record<string, unknown>;
    throughStageKey: string;
  },
  orderedStageKeys: string[],
): SeedStageSpec[] {
  const idx = orderedStageKeys.indexOf(input.throughStageKey);
  const upto = idx < 0 ? orderedStageKeys.length - 1 : idx;
  const specs: SeedStageSpec[] = [];
  for (let i = 0; i <= upto; i += 1) {
    const stageKey = orderedStageKeys[i];
    specs.push({ stageKey, output: outputForStage(stageKey, input) });
  }
  return specs;
}

function outputForStage(
  stageKey: string,
  ctx: { lineOfBusinessCode: string | null; summaryText: string; structuredData: Record<string, unknown> },
): Record<string, unknown> {
  switch (stageKey) {
    case 'ingestion':
      return { ok: true, service: 'ingestion', fileCount: ctx.structuredData.fileCount ?? null };
    case 'ocr':
      return { ok: true, service: 'ocr', text: ctx.summaryText, provider: 'tesseract' };
    case 'classification':
      return { ok: true, service: 'classification', lineOfBusinessCode: ctx.lineOfBusinessCode, confidence: 0.95 };
    case 'extraction':
      return { ok: true, service: 'extraction', structuredData: ctx.structuredData };
    case 'normalization':
      return { ok: true, service: 'normalization', normalized: ctx.structuredData };
    case 'validation':
      return { ok: true, service: 'validation', valid: true, issues: [] };
    case 'workflow':
      return { ok: true, service: 'workflow', decision: 'approved', score: 0.8 };
    default:
      return { ok: true, service: stageKey };
  }
}

/**
 * Persist a completed historical run (with input/output artifacts + executions)
 * for a submission. Runs inside the caller's transaction when provided.
 */
export async function seedPipelineRunForSubmission(
  args: {
    submissionId: number;
    organizationId: number | null;
    stages: SeedStageSpec[];
    baseTime: Date;
    trigger?: string;
  },
  transaction?: Transaction,
): Promise<PipelineRun | null> {
  if (args.stages.length === 0) return null;

  const stepMs = 45_000; // ~45s between stages for a believable timeline
  const startedAt = args.baseTime;
  const finishedAt = new Date(startedAt.getTime() + args.stages.length * stepMs);

  const run = await PipelineRun.create(
    {
      submissionId: args.submissionId,
      organizationId: args.organizationId,
      trigger: args.trigger ?? 'seed',
      fromStage: args.stages[0].stageKey,
      toStage: args.stages[args.stages.length - 1].stageKey,
      status: 'completed',
      startedAt,
      finishedAt,
    },
    { transaction },
  );

  const priorOutputs: Record<string, unknown> = {};
  for (let i = 0; i < args.stages.length; i += 1) {
    const spec = args.stages[i];
    const stageStarted = new Date(startedAt.getTime() + i * stepMs);
    const stageFinished = new Date(stageStarted.getTime() + Math.floor(stepMs / 2));
    const inputPayload = { submission: { id: args.submissionId, organizationId: args.organizationId }, ...priorOutputs };

    const inputArtifact = await createArtifact(
      { runId: run.id, submissionId: args.submissionId, organizationId: args.organizationId, stageKey: spec.stageKey, role: 'input', payload: inputPayload },
      transaction,
    );
    const outputArtifact = await createArtifact(
      { runId: run.id, submissionId: args.submissionId, organizationId: args.organizationId, stageKey: spec.stageKey, role: 'output', payload: spec.output },
      transaction,
    );
    await StageExecution.create(
      {
        runId: run.id,
        submissionId: args.submissionId,
        organizationId: args.organizationId,
        stageKey: spec.stageKey,
        attempt: 1,
        status: 'completed',
        inputArtifactId: inputArtifact.id,
        outputArtifactId: outputArtifact.id,
        provider: spec.stageKey === 'ocr' ? 'tesseract' : null,
        providerVersion: null,
        durationMs: Math.floor(stepMs / 2),
        startedAt: stageStarted,
        finishedAt: stageFinished,
        errorMessage: null,
        metadata: { trigger: 'seed' },
      } as never,
      { transaction },
    );

    priorOutputs[spec.stageKey] = spec.output;
  }

  return run;
}
