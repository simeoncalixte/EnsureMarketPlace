import type { FastifyRequest } from 'fastify';
import { Op } from 'sequelize';
import {
  IngestionChannel,
  IngestionEvent,
  InsurerProfile,
  Organization,
  RiskPortfolio,
  Submission,
  SubmissionFile,
  User,
} from '../../db/models';
import { resolveOrganizationIdFromRequest } from '../../lib/org';
import { computePriority, formatRelativeTime, humanize, type SubmissionPriority } from '../../lib/boardFormat';
import { PipelineLifecycleSubscription } from '../../db/models/pipelineConfig.models';
import { OcrService } from '../ocr/service';
import { persistOcrResult } from '../ocr/persistOcrResult';
import { ClassificationService } from '../classification/service';
import { ExtractionService } from '../extraction/service';
import { NormalizationService } from '../normalization/service';
import { ValidationService } from '../validation/service';
import { SchemaGenerationService } from '../schemaGeneration/service';
import { WorkflowService } from '../workflow/service';
import { RiskComputeService } from '../riskCompute/service';
import { prepareStageRun, recordStageRun } from '../playback/service';
import { extractStageSignals } from './stageSignals';

/**
 * Backend-configured Kanban board for the document-ingestion pipeline.
 *
 * Lanes are the pipeline **processing stages** (ingestion → OCR → … → workflow);
 * cards are active submissions positioned by where each one actually is in the
 * pipeline. A submission's current stage is read from its most recent
 * `IngestionEvent`; when a submission has no events yet (the common local-dev
 * case), we fall back to mapping its `Submission.status` onto a stage so the
 * board still reflects real rows.
 *
 * The response intentionally mirrors the shape returned by
 * `routes/underwritingSubmissions.ts` so the frontend can render it with the
 * same lane/card primitives.
 */

export type PipelineEventStatus = 'ok' | 'processing' | 'failed';

export type PipelineBoardStage = {
  key: string;
  label: string;
  accent: string;
  background: string;
  border: string;
  description: string;
  emptyState: string;
};

export type PipelineBoardItem = {
  id: number;
  stageKey: string;
  stageLabel: string;
  stageAccent: string;
  stageBackground: string;
  stageBorder: string;
  status: string;
  eventStatus: PipelineEventStatus;
  hasError: boolean;
  priority: SubmissionPriority;
  values: Record<string, string | number | null>;
};

export type PipelineBoardSummaryCard = {
  label: string;
  value: number;
  meta: string;
  format: 'number' | 'currency';
};

export type PipelineBoardConfig = {
  eyebrow: string;
  title: string;
  description: string;
  stages: PipelineBoardStage[];
};

export type PipelineBoardChannelStats = {
  /** Channels that are enabled and currently reporting an 'active' status. */
  active: number;
  total: number;
};

export type PipelineBoardResponse = {
  config: PipelineBoardConfig;
  /**
   * Every pipeline stage, independent of subscription state. `config.stages` is
   * filtered to the subscribed lanes for the board; this full catalog drives the
   * subscribe UI (so you can subscribe to stages you aren't subscribed to yet).
   */
  availableStages: PipelineBoardStage[];
  summary: PipelineBoardSummaryCard[];
  channels: PipelineBoardChannelStats;
  items: PipelineBoardItem[];
  refreshedAt: string;
};

type PipelineStageDefinition = PipelineBoardStage & {
  /** IngestionEvent.stage strings that map to this lane (matched loosely). */
  eventStages: string[];
  /** Submission.status values that fall back to this lane when no events exist. */
  statuses: string[];
};

/** Append an 8-digit-hex alpha channel to a #rrggbb accent. */
function withAlpha(hex: string, alpha: string): string {
  return `${hex}${alpha}`;
}

function defineStage(
  key: string,
  label: string,
  accent: string,
  eventStages: string[],
  statuses: string[],
): PipelineStageDefinition {
  return {
    key,
    label,
    accent,
    background: withAlpha(accent, '1f'), // ~12% opacity
    border: withAlpha(accent, '47'), // ~28% opacity
    description: `${label} stage of the document pipeline.`,
    emptyState: `No submissions in ${label.toLowerCase()}.`,
    eventStages,
    statuses,
  };
}

// Ordered lanes. Accents reuse the palette from the old PROCESS_META rail so the
// page keeps its visual language.
const PIPELINE_STAGES: PipelineStageDefinition[] = [
  defineStage('ingestion', 'Ingestion', '#4edea3', ['received', 'ingestion', 'ingestion-amqp', 'amqp-consume', 'amqp-retry-dlq'], ['draft', 'submitted']),
  defineStage('ocr', 'OCR', '#4b8eff', ['ocr'], []),
  defineStage('classification', 'Classification', '#adc6ff', ['classification'], []),
  defineStage('extraction', 'Extraction', '#7dd3fc', ['extraction'], []),
  defineStage('normalization', 'Normalization', '#a7f3d0', ['normalization'], []),
  defineStage('validation', 'Validation', '#fbbf24', ['validation'], ['modeling']),
  defineStage('schemaGeneration', 'Schema Generation', '#f0abfc', ['schema-generation', 'schemageneration'], []),
  defineStage(
    'workflow',
    'Rating & Workflow',
    '#c084fc',
    ['pre-rating', 'prerating', 'capacity-match', 'capacity', 'oracle-attestation', 'oracleattestation', 'workflow', 'storage-search', 'storagesearch'],
    ['priced', 'approved'],
  ),
  // Slice 5.4 — additive final lane. The risk-compute stage runs the credibility-
  // weighted compute spine (loss + price + provenance/confidence/ROL) and persists
  // a new PricingVersion. It is appended AFTER 'workflow' so the manual board
  // advance (which resolves the next stage from PIPELINE_STAGES order) can reach
  // it; every existing lane above is unchanged in order, name, and eventStages.
  defineStage('riskCompute', 'Pricing', '#f472b6', ['risk-compute', 'riskcompute'], []),
];

const DEFAULT_STAGE_KEY = PIPELINE_STAGES[0].key;
const FINAL_STAGE_KEY = PIPELINE_STAGES[PIPELINE_STAGES.length - 1].key;

/**
 * Canonical pipeline stages (key + human label) in processing order. Exposed so
 * seed tooling can mirror the exact lane keys the board renders and the
 * subscription convention used by the frontend (eventKey = key, stage = label).
 */
export const PIPELINE_STAGE_CATALOG: ReadonlyArray<{ key: string; label: string }> =
  PIPELINE_STAGES.map((stage) => ({ key: stage.key, label: stage.label }));

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const EVENT_STAGE_TO_KEY = new Map<string, string>();
const STATUS_TO_KEY = new Map<string, string>();
const STAGE_BY_KEY = new Map<string, PipelineStageDefinition>();
for (const stage of PIPELINE_STAGES) {
  STAGE_BY_KEY.set(stage.key, stage);
  EVENT_STAGE_TO_KEY.set(normalizeToken(stage.key), stage.key);
  for (const eventStage of stage.eventStages) {
    EVENT_STAGE_TO_KEY.set(normalizeToken(eventStage), stage.key);
  }
  for (const status of stage.statuses) {
    STATUS_TO_KEY.set(normalizeToken(status), stage.key);
  }
}

const FAILED_EVENT_STATUSES = new Set(['failed', 'error', 'dead', 'dlq', 'rejected']);
const PROCESSING_EVENT_STATUSES = new Set(['pending', 'processing', 'queued', 'in_progress', 'running', 'retry', 'retrying']);

function classifyEventStatus(event: IngestionEvent | null): PipelineEventStatus {
  if (!event) {
    return 'ok';
  }
  const status = (event.status ?? '').toLowerCase();
  if (event.errorMessage || FAILED_EVENT_STATUSES.has(status)) {
    return 'failed';
  }
  if (PROCESSING_EVENT_STATUSES.has(status)) {
    return 'processing';
  }
  return 'ok';
}

function resolveStageKey(latestEvent: IngestionEvent | null, status: string): string {
  if (latestEvent?.stage) {
    const fromEvent = EVENT_STAGE_TO_KEY.get(normalizeToken(latestEvent.stage));
    if (fromEvent) {
      return fromEvent;
    }
  }
  const fromStatus = STATUS_TO_KEY.get(normalizeToken(status ?? ''));
  return fromStatus ?? DEFAULT_STAGE_KEY;
}

function readAssociation<T>(submission: Submission, key: string): T | null {
  return ((submission as unknown as Record<string, unknown>)[key] as T | undefined) ?? null;
}

function ownerNameFor(user: User | null): string {
  if (!user) {
    return 'Unassigned';
  }
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return full || user.email || 'Unassigned';
}

function publicStage(stage: PipelineStageDefinition): PipelineBoardStage {
  return {
    key: stage.key,
    label: stage.label,
    accent: stage.accent,
    background: stage.background,
    border: stage.border,
    description: stage.description,
    emptyState: stage.emptyState,
  };
}

export async function buildPipelineBoard(request: FastifyRequest): Promise<PipelineBoardResponse> {
  const organizationId = await resolveOrganizationIdFromRequest(request);

  // Ingestion channels are stored against the org in the legacy `tenantId`
  // column (see routes/ingestionChannels.ts). Mirror that scoping so the count
  // matches what the user sees on the channels list. "Active" = enabled and
  // reporting an 'active' status (see PipelineIngestion.getProcessState).
  const channelWhere = organizationId ? { tenantId: organizationId } : {};
  const [totalChannels, activeChannels, subscriptionRows] = await Promise.all([
    IngestionChannel.count({ where: channelWhere }),
    IngestionChannel.count({ where: { ...channelWhere, enabled: true, status: 'active' } }),
    organizationId
      ? PipelineLifecycleSubscription.findAll({ where: { organizationId, enabled: true } })
      : Promise.resolve([] as PipelineLifecycleSubscription[]),
  ]);

  // Only display the stages (lanes) this organization has subscribed to. The
  // subscribe view writes one subscription per stage keyed by the lane key, so
  // we match on eventKey/process. When no organization can be resolved (e.g. an
  // unauthenticated dev/Storybook call) per-org subscriptions can't apply, so we
  // fall back to showing every stage.
  const subscribedKeys = new Set<string>();
  for (const row of subscriptionRows) {
    if (row.eventKey) subscribedKeys.add(row.eventKey);
    if (row.process) subscribedKeys.add(row.process);
  }
  const displayedStages = organizationId
    ? PIPELINE_STAGES.filter((stage) => subscribedKeys.has(stage.key))
    : PIPELINE_STAGES;
  const displayedKeys = new Set(displayedStages.map((stage) => stage.key));

  const insurerInclude = organizationId
    ? {
        model: InsurerProfile,
        as: 'insurerProfile',
        required: true,
        where: { organizationId },
        include: [{ model: Organization, as: 'organization' }],
      }
    : {
        model: InsurerProfile,
        as: 'insurerProfile',
        include: [{ model: Organization, as: 'organization' }],
      };

  // Only single (belongsTo/hasOne) associations are included here, so there is
  // no row multiplication and no need for `distinct`. IngestionEvent + file
  // counts are fetched in batched follow-up queries below.
  const include: unknown[] = [
    insurerInclude,
    { model: RiskPortfolio, as: 'portfolio' },
    { model: User, as: 'submittedBy' },
  ];

  const submissions = await Submission.findAll({
    where: { status: { [Op.ne]: 'rejected' } },
    include: include as never,
    order: [['receivedAt', 'DESC'], ['createdAt', 'DESC'], ['id', 'DESC']],
  });

  const submissionIds = submissions.map((submission) => submission.id);

  // Latest IngestionEvent per submission (one batched query, ordered newest-first).
  const latestEventBySubmission = new Map<number, IngestionEvent>();
  // File counts per submission (batched; SubmissionFile is hasMany so we avoid
  // including it in the findAll above to prevent row multiplication).
  const fileCountBySubmission = new Map<number, number>();

  if (submissionIds.length > 0) {
    const [events, files] = await Promise.all([
      IngestionEvent.findAll({
        // `ingestion_events` only has created_at (no updated_at), so select
        // explicit columns rather than the model's full attribute set.
        attributes: ['id', 'submissionId', 'stage', 'status', 'errorMessage', 'metadata', 'createdAt'],
        where: { submissionId: { [Op.in]: submissionIds } },
        order: [['createdAt', 'DESC'], ['id', 'DESC']],
      }),
      SubmissionFile.findAll({
        where: { submissionId: { [Op.in]: submissionIds } },
        attributes: ['id', 'submissionId'],
      }),
    ]);

    for (const event of events) {
      const sid = event.submissionId;
      if (sid != null && !latestEventBySubmission.has(sid)) {
        latestEventBySubmission.set(sid, event);
      }
    }

    for (const file of files) {
      const sid = file.submissionId;
      if (sid != null) {
        fileCountBySubmission.set(sid, (fileCountBySubmission.get(sid) ?? 0) + 1);
      }
    }
  }

  const items: PipelineBoardItem[] = submissions.map((submission) => {
    const portfolio = readAssociation<RiskPortfolio>(submission, 'portfolio');
    const insurerProfile = readAssociation<InsurerProfile>(submission, 'insurerProfile');
    const insurerOrganization = insurerProfile
      ? readAssociation<Organization>(insurerProfile as unknown as Submission, 'organization')
      : null;
    const submittedBy = readAssociation<User>(submission, 'submittedBy');

    const latestEvent = latestEventBySubmission.get(submission.id) ?? null;
    const status = String(submission.status);
    const stageKey = resolveStageKey(latestEvent, status);
    const stage = STAGE_BY_KEY.get(stageKey) ?? PIPELINE_STAGES[0];
    const eventStatus = classifyEventStatus(latestEvent);
    const eventWarnings = Array.isArray((latestEvent as { metadata?: { warnings?: unknown } } | null)?.metadata?.warnings)
      ? ((latestEvent as unknown as { metadata: { warnings: unknown[] } }).metadata.warnings.map(String))
      : [];

    const premium = Number(portfolio?.totalPremium ?? 0);
    const exposure = Number(portfolio?.totalExposure ?? 0);
    const priority = computePriority({ premium, exposure, status });

    const values: Record<string, string | number | null> = {
      submissionNumber: `SUB-${String(submission.id).padStart(4, '0')}`,
      submissionId: submission.id,
      cedent: insurerOrganization?.name ?? (insurerProfile?.id ? `Carrier ${insurerProfile.id}` : 'Unspecified cedent'),
      lineOfBusiness: humanize(portfolio?.perilType ?? portfolio?.name ?? null),
      region: portfolio?.region ?? 'Unspecified',
      source: humanize(submission.source ?? submission.transport ?? 'system'),
      transport: submission.transport ?? null,
      owner: ownerNameFor(submittedBy),
      receivedLabel: formatRelativeTime(submission.receivedAt ?? submission.createdAt),
      receivedAt: submission.receivedAt ? new Date(submission.receivedAt).toISOString() : null,
      fileCount: fileCountBySubmission.get(submission.id) ?? 0,
      status,
      stageLabel: stage.label,
      eventStatus,
      lastEventStage: latestEvent?.stage ?? null,
      lastEventLabel: latestEvent ? formatRelativeTime(latestEvent.createdAt) : 'No pipeline events yet',
      errorMessage: latestEvent?.errorMessage ?? null,
      warningCount: eventWarnings.length,
      lastWarning: eventWarnings[0] ?? null,
      premium,
      exposure,
    };

    return {
      id: submission.id,
      stageKey: stage.key,
      stageLabel: stage.label,
      stageAccent: stage.accent,
      stageBackground: stage.background,
      stageBorder: stage.border,
      status,
      eventStatus,
      hasError: eventStatus === 'failed',
      priority,
      values,
    };
  });

  // Restrict the cards to submissions whose current stage is a displayed
  // (subscribed) lane, so the counts match what is rendered.
  const displayedItems = items.filter((item) => displayedKeys.has(item.stageKey));

  const activeCount = displayedItems.length;
  const inProcessingCount = displayedItems.filter((item) => item.stageKey !== FINAL_STAGE_KEY).length;
  const failedCount = displayedItems.filter((item) => item.eventStatus === 'failed').length;
  const totalPremium = displayedItems.reduce((sum, item) => sum + Number(item.values.premium ?? 0), 0);

  return {
    config: {
      eyebrow: 'Pipeline monitor',
      title: 'Pipeline Processes',
      description: 'Active submissions across each subscribed stage of the ingestion pipeline.',
      stages: displayedStages.map(publicStage),
    },
    availableStages: PIPELINE_STAGES.map(publicStage),
    summary: [
      { label: 'Active submissions', value: activeCount, meta: 'Submissions currently moving through the pipeline.', format: 'number' },
      { label: 'In processing', value: inProcessingCount, meta: 'Not yet at the rating & workflow stage.', format: 'number' },
      { label: 'Needs attention', value: failedCount, meta: 'Submissions whose latest pipeline event failed.', format: 'number' },
      { label: 'Pipeline premium', value: totalPremium, meta: 'Total premium represented across active submissions.', format: 'currency' },
    ],
    channels: { active: activeChannels, total: totalChannels },
    items: displayedItems,
    refreshedAt: new Date().toISOString(),
  };
}

// Maps a pipeline stage to the service that runs it. (Ingestion has no runner —
// it is the entry point, never a "next" stage to advance into.)
const STAGE_RUNNERS: Record<string, (payload: unknown) => Promise<Record<string, unknown>>> = {
  ocr: (payload) => new OcrService().process(payload, { onSuccess: persistOcrResult }),
  classification: (payload) => new ClassificationService().process(payload),
  extraction: (payload) => new ExtractionService().process(payload),
  normalization: (payload) => new NormalizationService().process(payload),
  validation: (payload) => new ValidationService().process(payload),
  schemaGeneration: (payload) => new SchemaGenerationService().process(payload),
  workflow: (payload) => new WorkflowService().process(payload),
  // Slice 5.4 — additive runner. Wraps the existing compute spine; total/guarded.
  riskCompute: (payload) => new RiskComputeService().process(payload),
};

export type AdvanceSubmissionResult = {
  ok: boolean;
  submissionId: number;
  fromStage: string;
  fromStageLabel: string;
  toStage: string;
  toStageLabel: string;
  eventStatus: PipelineEventStatus;
  error: string | null;
  /** Non-fatal degradation signals from the stage (e.g. a file that failed OCR). */
  warnings: string[];
  /** The replayable run this advance was recorded under (null if capture failed). */
  runId: number | null;
};

export type AdvanceSubmissionError = { error: string; code: number };

/**
 * Run `targetStage` for a submission and record the move. Shared by advancing to
 * the next stage and re-running the current (failed) stage — the two differ only
 * in which stage is the target and what the input-assembly "from" stage is.
 *
 * `fromStage` is the stage whose recorded outputs (plus everything before it) seed
 * the target's input: the prior stage when advancing, the stage-before-target when
 * re-running. A service failure is recorded as a 'failed' event (so the board can
 * show it, and offer a re-run) rather than raising a request error.
 */
async function executeStageTransition(
  submission: Submission,
  fromStage: PipelineStageDefinition,
  targetStage: PipelineStageDefinition,
  trigger: 'manual' | 'rerun',
): Promise<AdvanceSubmissionResult> {
  // Open/reuse the replayable run and assemble this stage's input from the prior
  // stages' recorded outputs. Best-effort: if playback capture is unavailable
  // (e.g. the migration hasn't run) the stage still executes — it just receives
  // the bare submission, exactly as before.
  let prepared: Awaited<ReturnType<typeof prepareStageRun>> | null = null;
  try {
    prepared = await prepareStageRun({
      submissionId: submission.id,
      tenantId: submission.tenantId ?? null,
      fromStageKey: fromStage.key,
      toStageKey: targetStage.key,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `playback: prepareStageRun failed for submission ${submission.id}:`,
      err instanceof Error ? err.message : err,
    );
  }

  const inputPayload: Record<string, unknown> = {
    submission: { id: submission.id, tenantId: submission.tenantId },
    ...(prepared?.priorOutputs ?? {}),
  };

  let errorMessage: string | null = null;
  let warnings: string[] = [];
  let signals: Record<string, unknown> = {};
  let ranOk = true;
  let result: Record<string, unknown> | undefined;
  const startedAt = new Date();
  const runner = STAGE_RUNNERS[targetStage.key];
  if (runner) {
    try {
      result = await runner(inputPayload);
      const rawWarnings = (result as Record<string, unknown>)?.warnings;
      if (Array.isArray(rawWarnings)) warnings = rawWarnings.map((w) => String(w)).filter(Boolean);
      signals = extractStageSignals(result);
      if (result && (result as Record<string, unknown>).ok === false) {
        ranOk = false;
        errorMessage = String((result as Record<string, unknown>).error ?? 'stage reported failure');
      }
    } catch (err) {
      ranOk = false;
      errorMessage = err instanceof Error ? err.message : String(err);
    }
  }
  const finishedAt = new Date();

  // Persist the stage's input + output artifacts and its execution, then link the
  // IngestionEvent (and so the board) to that replayable record via input/output
  // refs and the run id.
  let runId: number | null = null;
  let inputRef: string | null = null;
  let outputRef: string | null = null;
  if (prepared) {
    try {
      const recorded = await recordStageRun({
        run: prepared.run,
        submissionId: submission.id,
        tenantId: submission.tenantId ?? null,
        stageKey: targetStage.key,
        isFinalStage: targetStage.key === FINAL_STAGE_KEY,
        status: ranOk ? 'completed' : 'failed',
        inputPayload,
        outputPayload: result ?? { ok: ranOk, error: errorMessage },
        provider: result && typeof result.provider === 'string' ? result.provider : null,
        startedAt,
        finishedAt,
        errorMessage,
        metadata: signals,
      });
      runId = recorded.runId;
      inputRef = String(recorded.inputArtifactId);
      outputRef = String(recorded.outputArtifactId);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        `playback: recordStageRun failed for submission ${submission.id}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  await IngestionEvent.create({
    submissionId: submission.id,
    tenantId: submission.tenantId ?? null,
    stage: targetStage.key,
    status: ranOk ? 'completed' : 'failed',
    inputRef,
    outputRef,
    errorMessage,
    metadata: { trigger, runId, ...(warnings.length ? { warnings } : {}), ...signals },
  } as never);

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
  };
}

/** Latest pipeline event for a submission (drives current-stage resolution). */
async function latestEventFor(submissionId: number): Promise<IngestionEvent | null> {
  return IngestionEvent.findOne({
    attributes: ['id', 'submissionId', 'stage', 'status', 'errorMessage', 'createdAt'],
    where: { submissionId },
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
  });
}

/**
 * Manually run the next pipeline stage for a submission and record the move.
 *
 * Resolves the submission's current stage (latest IngestionEvent → status
 * fallback) and runs the next stage's service best-effort.
 */
export async function advanceSubmissionToNextStage(
  submissionId: number,
): Promise<AdvanceSubmissionResult | AdvanceSubmissionError> {
  const submission = await Submission.findByPk(submissionId);
  if (!submission) {
    return { error: 'submission_not_found', code: 404 };
  }

  const latestEvent = await latestEventFor(submissionId);
  const currentKey = resolveStageKey(latestEvent, String(submission.status));
  const currentIndex = PIPELINE_STAGES.findIndex((stage) => stage.key === currentKey);
  const currentStage = PIPELINE_STAGES[currentIndex] ?? PIPELINE_STAGES[0];
  const nextStage = PIPELINE_STAGES[currentIndex + 1];

  if (!nextStage) {
    return { error: 'already_at_final_stage', code: 400 };
  }

  return executeStageTransition(submission, currentStage, nextStage, 'manual');
}

/**
 * Re-run a pipeline stage for a submission — typically the current (failed) one,
 * surfaced as a "Re-run" call to action on a failed board card. Re-runs the
 * resolved current stage by default, or an explicit `stageKey` when provided. The
 * stage is fed the same inputs it received originally (the recorded outputs of all
 * prior stages), so a transient failure can be retried in place without advancing.
 */
export async function rerunSubmissionStage(
  submissionId: number,
  opts: { stageKey?: string } = {},
): Promise<AdvanceSubmissionResult | AdvanceSubmissionError> {
  const submission = await Submission.findByPk(submissionId);
  if (!submission) {
    return { error: 'submission_not_found', code: 404 };
  }

  const latestEvent = await latestEventFor(submissionId);
  const targetKey = opts.stageKey
    ? (EVENT_STAGE_TO_KEY.get(normalizeToken(opts.stageKey)) ?? normalizeToken(opts.stageKey))
    : resolveStageKey(latestEvent, String(submission.status));
  const targetIndex = PIPELINE_STAGES.findIndex((stage) => stage.key === targetKey);
  const targetStage = PIPELINE_STAGES[targetIndex];

  if (!targetStage) {
    return { error: 'unknown_stage', code: 400 };
  }
  // Ingestion is the entry point, not a re-runnable processing stage.
  if (!STAGE_RUNNERS[targetStage.key]) {
    return { error: 'stage_not_rerunnable', code: 400 };
  }

  const fromStage = PIPELINE_STAGES[targetIndex - 1] ?? targetStage;
  return executeStageTransition(submission, fromStage, targetStage, 'rerun');
}
