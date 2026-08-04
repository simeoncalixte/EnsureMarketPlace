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
  SubmissionOutput,
  User,
} from '../../../db/models';
import { resolveOrganizationIdFromRequest } from '../../lib/org';
import { computePriority, formatRelativeTime, humanize, type SubmissionPriority } from '../../lib/boardFormat';
import { PipelineLifecycleSubscription } from '../../../db/models/pipelineConfig.models';
import { routeForType } from '../routing/routes';
import { submissionTypeTaxonomy } from '../../../db/seed-data/submissionTypeTaxonomy';
import {
  FINAL_STAGE_KEY,
  PIPELINE_STAGE_DEFINITIONS,
  type PipelineStageDefinition,
  resolveStageKey,
  stageForKey,
} from '../stages/registry';

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

/**
 * Line of business as produced by the classification stage, read from the
 * persisted SubmissionOutput.structuredData. Prefers the human label, then the
 * humanized code; returns null when the stage has not classified the submission.
 */
function pickLineOfBusiness(data: Record<string, unknown>): string | null {
  const classification = (data.classification ?? null) as Record<string, unknown> | null;
  const canonicalLob = ((data.canonical ?? null) as { lineOfBusiness?: Record<string, unknown> } | null)
    ?.lineOfBusiness;
  const label =
    // Prefer the single reconciled source; fall back to the legacy denormalised
    // scalars and the classification block for records written before `canonical`.
    canonicalLob?.primaryLabel ??
    canonicalLob?.primaryCode ??
    data.lineOfBusiness ??
    classification?.lineOfBusinessLabel ??
    data.lineOfBusinessCode ??
    classification?.lineOfBusinessCode;
  if (typeof label === 'string' && label.trim()) {
    return humanize(label.trim());
  }
  return null;
}

/**
 * A concise card region derived from the location-discovery stage output. Uses
 * the first resolved location's formatted address, trimmed to its trailing
 * city/region/country components so the card stays readable. Returns null when
 * no location has been resolved yet.
 */
function pickRegion(data: Record<string, unknown>): string | null {
  const discovery = (data.locationDiscovery ?? null) as { locations?: unknown } | null;
  const locations = Array.isArray(discovery?.locations) ? (discovery!.locations as unknown[]) : [];
  for (const entry of locations) {
    const loc = entry as { resolved?: unknown; formattedAddress?: unknown };
    if (loc?.resolved !== true) continue;
    const address = typeof loc.formattedAddress === 'string' ? loc.formattedAddress.trim() : '';
    if (!address) continue;
    const parts = address
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    // Keep the trailing region components (e.g. "City, State, Country") rather
    // than a full street address.
    return parts.length > 2 ? parts.slice(-2).join(', ') : address;
  }
  return null;
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

/** submission-type code → human label, for the per-type board title. */
const SUBMISSION_TYPE_LABEL = new Map(submissionTypeTaxonomy.map((t) => [t.code, t.label]));

export async function buildPipelineBoard(
  request: FastifyRequest,
  options: { type?: string | null } = {},
): Promise<PipelineBoardResponse> {
  const organizationId = await resolveOrganizationIdFromRequest(request);

  // When a submission-type is requested (the per-branch board pages, e.g.
  // /pipeline/processes/board?type=claim), the board is scoped to that route:
  // only that route's lanes are shown, and only submissions of that type. An
  // unknown/empty type means the combined "all submissions" board (unchanged).
  const routeType = typeof options.type === 'string' && options.type.trim() ? options.type.trim() : null;
  const routeStageKeys = routeType ? new Set(routeForType(routeType).keys) : null;

  // Ingestion channels are stored against the org in the legacy `organizationId`
  // column (see routes/ingestionChannels.ts). Mirror that scoping so the count
  // matches what the user sees on the channels list. "Active" = enabled and
  // reporting an 'active' status (see PipelineIngestion.getProcessState).
  const channelWhere = organizationId ? { organizationId: organizationId } : {};
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
  // A per-type board shows exactly that route's lanes (the whole point of the
  // page), so it overrides the org's subscription-based lane filter.
  const displayedStages = routeStageKeys
    ? PIPELINE_STAGE_DEFINITIONS.filter((stage) => routeStageKeys.has(stage.key))
    : organizationId
      ? PIPELINE_STAGE_DEFINITIONS.filter((stage) => subscribedKeys.has(stage.key))
      : PIPELINE_STAGE_DEFINITIONS;
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

  // Pipeline-derived facts per submission, read from the persisted
  // SubmissionOutput.structuredData written by the pipeline stages:
  //   - submissionTypeCode  (submissionType stage)
  //   - lineOfBusiness/Code (classification stage)
  //   - locationDiscovery   (location-discovery stage) -> a card region
  // These are the *actual* pipeline outputs; the static RiskPortfolio profile
  // is only used as a fallback when a submission has not produced them yet.
  const typeCodeBySubmission = new Map<number, string>();
  const lineOfBusinessBySubmission = new Map<number, string>();
  const regionBySubmission = new Map<number, string>();
  if (submissionIds.length > 0) {
    const outputs = await SubmissionOutput.findAll({
      where: { submissionId: { [Op.in]: submissionIds } },
      attributes: ['submissionId', 'structuredData'],
      order: [['id', 'DESC']],
    });
    for (const output of outputs) {
      const sid = output.submissionId;
      if (sid == null) continue;
      const data = (output.structuredData ?? null) as Record<string, unknown> | null;
      if (!data) continue;

      if (!typeCodeBySubmission.has(sid)) {
        const canonicalType = (data.canonical as { submissionType?: { code?: unknown } } | undefined)
          ?.submissionType?.code;
        const code = canonicalType ?? data.submissionTypeCode;
        if (typeof code === 'string' && code) typeCodeBySubmission.set(sid, code);
      }

      if (!lineOfBusinessBySubmission.has(sid)) {
        const lob = pickLineOfBusiness(data);
        if (lob) lineOfBusinessBySubmission.set(sid, lob);
      }

      if (!regionBySubmission.has(sid)) {
        const region = pickRegion(data);
        if (region) regionBySubmission.set(sid, region);
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
    const stageKey = resolveStageKey(latestEvent?.stage, status);
    const stage = stageForKey(stageKey) ?? PIPELINE_STAGE_DEFINITIONS[0];
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
      submissionType: typeCodeBySubmission.get(submission.id) ?? null,
      cedent: insurerOrganization?.name ?? (insurerProfile?.id ? `Carrier ${insurerProfile.id}` : 'Unspecified cedent'),
      lineOfBusiness:
        lineOfBusinessBySubmission.get(submission.id) ??
        humanize(portfolio?.perilType ?? portfolio?.name ?? null),
      region: regionBySubmission.get(submission.id) ?? portfolio?.region ?? 'Unspecified',
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
  // (subscribed) lane, so the counts match what is rendered. On a per-type board,
  // additionally keep only submissions of that type (the type is persisted once
  // the submissionType stage has run; untyped submissions stay on the combined
  // board only).
  const displayedItems = items.filter(
    (item) => displayedKeys.has(item.stageKey) && (!routeType || item.values.submissionType === routeType),
  );

  const activeCount = displayedItems.length;
  const inProcessingCount = displayedItems.filter((item) => item.stageKey !== FINAL_STAGE_KEY).length;
  const failedCount = displayedItems.filter((item) => item.eventStatus === 'failed').length;
  const totalPremium = displayedItems.reduce((sum, item) => sum + Number(item.values.premium ?? 0), 0);

  const routeLabel = routeType ? SUBMISSION_TYPE_LABEL.get(routeType) ?? humanize(routeType) : null;

  return {
    config: {
      eyebrow: routeLabel ? 'Pipeline route' : 'Pipeline monitor',
      title: routeLabel ? `${routeLabel} Pipeline` : 'Pipeline Processes',
      description: routeLabel
        ? `Submissions on the ${routeLabel.toLowerCase()} route, across each of its stages.`
        : 'Active submissions across each subscribed stage of the ingestion pipeline.',
      stages: displayedStages.map(publicStage),
    },
    // On a per-type board, the "available" stages ARE the route's stages, so the
    // client computes each card's next stage along the route (not the full path).
    availableStages: (routeStageKeys ? displayedStages : PIPELINE_STAGE_DEFINITIONS).map(publicStage),
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

export { buildPipelineFlow } from './flow';
export type {
  PipelineFlowLegendEntry,
  PipelineFlowLink,
  PipelineFlowNode,
  PipelineFlowResponse,
  PipelineFlowSummaryCard,
} from './flow';

