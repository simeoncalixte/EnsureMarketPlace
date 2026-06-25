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
} from '../../db/models';
import { resolveOrganizationIdFromRequest } from '../../lib/org';
import { computePriority, formatRelativeTime, humanize, type SubmissionPriority } from '../../lib/boardFormat';
import { PipelineLifecycleSubscription } from '../../db/models/pipelineConfig.models';
import { OcrService } from '../ocr/service';
import { SubmissionTypeService } from '../submissionType/service';
import { nextStageKeyInRoute, prevStageKeyInRoute, routeForType } from '../routing/routes';
import { resolveSubmissionRoute } from '../routing/resolveRoute';
import { submissionTypeTaxonomy } from '../../db/seed-data/submissionTypeTaxonomy';
import { persistOcrResult } from '../ocr/persistOcrResult';
import { ClassificationService } from '../classification/service';
import { AssignmentService } from '../assignment/service';
import { ExtractionService } from '../extraction/service';
import { InsuredSubjectService } from '../insuredSubject/service';
import { LocationDiscoveryService } from '../locationDiscovery/service';
import { NormalizationService } from '../normalization/service';
import { ValidationService } from '../validation/service';
import { SchemaGenerationService } from '../schemaGeneration/service';
import { WorkflowService } from '../workflow/service';
import { PreRatingService } from '../preRating/service';
import { CapacityMatchService } from '../capacity/service';
import { OracleAttestationService } from '../oracleAttestation/service';
import { RiskComputeService } from '../riskCompute/service';
import { PreBindComplianceService } from '../preBindCompliance/service';
import { prepareStageRun, recordAgentTraces, recordStageRun } from '../playback/service';
import { createAgentTraceCapture } from '../agents/trace';
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
  // Determine WHAT KIND of submission this is (new business, renewal, endorsement,
  // claim, cancellation, treaty/facultative reinsurance) right after OCR and before
  // the LOB classifier — a distinct dimension from line of business.
  defineStage('submissionType', 'Submission Type', '#93c5fd', ['submission-type', 'submissiontype'], []),
  // Internal key stays 'classification' (a stable contract used by event history,
  // playback replay, lane subscriptions, migrations, and cross-stage data
  // threading); the lane is LABELLED "Line of Business" because that is what the
  // stage actually determines. The label propagates to the board, the per-type
  // boards, and the flow Sankey (whose node labels read from here).
  defineStage('classification', 'Line of Business', '#adc6ff', ['classification', 'line-of-business', 'lineofbusiness'], []),
  // Give the submission a human owner — a department, team, and person — chosen
  // from the staff role that should own its transaction type. Runs after the LOB
  // classifier (so type + line of business are both known) and before extraction,
  // so the assigned owner oversees the data-heavy stages that follow.
  defineStage('assignment', 'Assignment', '#c3b5fd', ['assignment'], []),
  defineStage('extraction', 'Extraction', '#7dd3fc', ['extraction'], []),
  // Enumerate the insured subject(s) and extract every key-value pair relative to
  // each (SOV rows, address, TIV, construction). Sits after extraction (whose
  // subjects it enriches) and before location discovery (which geocodes them).
  defineStage('insuredSubject', 'Insured Subjects', '#67e8f9', ['insured-subject', 'insuredsubject'], []),
  // Discover + normalize a location for each insured subject (geocoding). Sits
  // after extraction (where subjects are born) and before normalization, so the
  // geocoded coordinates/addresses flow into canonicalization and modeling.
  defineStage('locationDiscovery', 'Location Discovery', '#5eead4', ['location-discovery', 'locationdiscovery'], []),
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
  // Close-the-loop Issue 1 — the pre-bind compliance gate. Runs sanctions/OFAC
  // screening + carrier admitted-status after pricing and persists a
  // ComplianceClearance. Appended AFTER 'riskCompute' so the manual advance can
  // reach it; the underwriting board's bind/quote gate reads the clearance it
  // produces. The 'compliance' status maps a submission into this lane when it has
  // no events yet.
  defineStage('preBindCompliance', 'Pre-bind Compliance', '#f87171', ['pre-bind-compliance', 'prebindcompliance', 'compliance'], ['compliance']),
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

/**
 * Line of business as produced by the classification stage, read from the
 * persisted SubmissionOutput.structuredData. Prefers the human label, then the
 * humanized code; returns null when the stage has not classified the submission.
 */
function pickLineOfBusiness(data: Record<string, unknown>): string | null {
  const classification = (data.classification ?? null) as Record<string, unknown> | null;
  const label =
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
    ? PIPELINE_STAGES.filter((stage) => routeStageKeys.has(stage.key))
    : organizationId
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
        const code = data.submissionTypeCode;
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
    availableStages: (routeStageKeys ? displayedStages : PIPELINE_STAGES).map(publicStage),
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

// --- Pipeline flow (Sankey) --------------------------------------------------

export type PipelineFlowNode = {
  key: string;
  label: string;
  accent: string;
  /** Submission-type code for post-fork (type-scoped) nodes; null for the shared trunk. */
  type?: string | null;
  typeLabel?: string | null;
  /** Whether the node's submission count is safe to render (true only for single-per-column trunk nodes). */
  showValue?: boolean;
};
/** A directed flow A→B; source/target are indices into the `nodes` array. */
export type PipelineFlowLink = { source: number; target: number; value: number };
export type PipelineFlowSummaryCard = { label: string; value: number; meta: string; format: 'number' };
export type PipelineFlowLegendEntry = { code: string; label: string; color: string };
export type PipelineFlowResponse = {
  config: { eyebrow: string; title: string; description: string };
  nodes: PipelineFlowNode[];
  links: PipelineFlowLink[];
  legend: PipelineFlowLegendEntry[];
  summary: PipelineFlowSummaryCard[];
  refreshedAt: string;
};

/** Canonical position of a stage key (drives forward-only, acyclic flow). */
const STAGE_ORDER_INDEX = new Map(PIPELINE_STAGES.map((stage, index) => [stage.key, index]));
/** Stages at/before this index are the shared trunk; after it, nodes split per type. */
const FLOW_FORK_INDEX = STAGE_ORDER_INDEX.get('submissionType') ?? 2;
/** Distinct colour per submission type so each post-fork lane reads as one type. */
const FLOW_TYPE_COLOR: Record<string, string> = {
  new_business: '#4ade80',
  renewal: '#38bdf8',
  quote_request: '#a78bfa',
  endorsement: '#fbbf24',
  cancellation: '#fb7185',
  claim: '#f97316',
  audit: '#2dd4bf',
  treaty_reinsurance: '#c084fc',
  facultative_reinsurance: '#f472b6',
  inquiry: '#94a3b8',
  unknown: '#64748b',
};

/** Composite node key: shared stage key in the trunk, `type::stage` after the fork. */
function flowNodeKey(stageKey: string, type: string): string {
  const idx = STAGE_ORDER_INDEX.get(stageKey);
  return idx != null && idx <= FLOW_FORK_INDEX ? stageKey : `${type}::${stageKey}`;
}

function parseFlowNodeKey(key: string): { stageKey: string; type: string | null } {
  const sep = key.indexOf('::');
  if (sep === -1) return { stageKey: key, type: null };
  return { type: key.slice(0, sep), stageKey: key.slice(sep + 2) };
}

/**
 * Aggregate the COMPLETE pipeline as a flow (Sankey) for the org. Each submission's
 * ordered stage history (from its IngestionEvents) is collapsed to the distinct
 * stages it visited, and each forward transition A→B is counted (flow width = how
 * many submissions made that move).
 *
 * The shared trunk (ingestion → ocr → submissionType) is single, but EVERY stage
 * AFTER submissionType is split per submission type, so each type becomes its own
 * coloured lane that never re-merges — the new-business lane runs all the way to
 * pricing while the claim lane ends at normalization. This is what gives the
 * diagram its variation instead of one linear chain. The per-submission type comes
 * from the submissionType stage (persisted on SubmissionOutput).
 *
 * Only FORWARD transitions (target later than source in canonical order) are
 * counted, so a re-run never introduces a cycle — recharts' Sankey requires a DAG.
 */
export async function buildPipelineFlow(request: FastifyRequest): Promise<PipelineFlowResponse> {
  const organizationId = await resolveOrganizationIdFromRequest(request);

  const insurerInclude = organizationId
    ? { model: InsurerProfile, as: 'insurerProfile', required: true, where: { organizationId } }
    : { model: InsurerProfile, as: 'insurerProfile' };

  const submissions = await Submission.findAll({
    where: { status: { [Op.ne]: 'rejected' } },
    include: [insurerInclude] as never,
    attributes: ['id'],
  });
  const submissionIds = submissions.map((submission) => submission.id);

  const transitionCounts = new Map<string, number>();
  const presentKeys = new Set<string>();
  let completed = 0;
  let failed = 0;

  if (submissionIds.length > 0) {
    // Submission type per submission (persisted by the submissionType stage).
    const typeBySubmission = new Map<number, string>();
    const outputs = await SubmissionOutput.findAll({
      where: { submissionId: { [Op.in]: submissionIds } },
      attributes: ['submissionId', 'structuredData'],
      order: [['id', 'DESC']],
    });
    for (const output of outputs) {
      const sid = output.submissionId;
      if (sid == null || typeBySubmission.has(sid)) continue;
      const code = (output.structuredData as { submissionTypeCode?: unknown } | null)?.submissionTypeCode;
      if (typeof code === 'string' && code) typeBySubmission.set(sid, code);
    }

    const events = await IngestionEvent.findAll({
      attributes: ['id', 'submissionId', 'stage', 'status', 'metadata', 'createdAt'],
      where: { submissionId: { [Op.in]: submissionIds } },
      order: [['submissionId', 'ASC'], ['createdAt', 'ASC'], ['id', 'ASC']],
    });

    const sequenceBySubmission = new Map<number, string[]>();
    const lastFailedBySubmission = new Map<number, boolean>();
    for (const event of events) {
      const sid = event.submissionId;
      if (sid == null) continue;
      const key = EVENT_STAGE_TO_KEY.get(normalizeToken(event.stage ?? ''));
      if (!key) continue;
      const seq = sequenceBySubmission.get(sid) ?? [];
      if (seq[seq.length - 1] !== key) seq.push(key); // collapse consecutive repeats (re-runs)
      sequenceBySubmission.set(sid, seq);
      lastFailedBySubmission.set(sid, classifyEventStatus(event) === 'failed');
      // Fallback type source: simulated events carry the route on their metadata.
      if (!typeBySubmission.has(sid)) {
        const route = (event.metadata as { route?: unknown } | null)?.route;
        if (typeof route === 'string' && route) typeBySubmission.set(sid, route);
      }
    }

    for (const [sid, seq] of sequenceBySubmission) {
      const type = typeBySubmission.get(sid) ?? 'unknown';
      for (let i = 0; i < seq.length - 1; i++) {
        const from = seq[i];
        const to = seq[i + 1];
        const fromIdx = STAGE_ORDER_INDEX.get(from);
        const toIdx = STAGE_ORDER_INDEX.get(to);
        if (fromIdx == null || toIdx == null || toIdx <= fromIdx) continue; // forward only
        const fromNode = flowNodeKey(from, type);
        const toNode = flowNodeKey(to, type);
        presentKeys.add(fromNode);
        presentKeys.add(toNode);
        const edge = `${fromNode}>>${toNode}`;
        transitionCounts.set(edge, (transitionCounts.get(edge) ?? 0) + 1);
      }
      if (seq.includes(FINAL_STAGE_KEY)) completed += 1;
      if (lastFailedBySubmission.get(sid)) failed += 1;
    }
  }

  // Nodes: ordered by stage (canonical) then type, so indices are stable and the
  // chart reads left-to-right by stage with the type lanes stacked within a column.
  const parsed = [...presentKeys]
    .map((key) => ({ key, ...parseFlowNodeKey(key) }))
    .sort(
      (a, b) =>
        (STAGE_ORDER_INDEX.get(a.stageKey) ?? 0) - (STAGE_ORDER_INDEX.get(b.stageKey) ?? 0) ||
        String(a.type ?? '').localeCompare(String(b.type ?? '')),
    );
  const nodeIndexByKey = new Map(parsed.map((node, index) => [node.key, index]));
  const nodes: PipelineFlowNode[] = parsed.map((node) => {
    const stage = STAGE_BY_KEY.get(node.stageKey)!;
    if (node.type) {
      return {
        key: node.key,
        label: stage.label,
        accent: FLOW_TYPE_COLOR[node.type] ?? FLOW_TYPE_COLOR.unknown,
        type: node.type,
        typeLabel: SUBMISSION_TYPE_LABEL.get(node.type) ?? humanize(node.type),
        showValue: false,
      };
    }
    return { key: node.key, label: stage.label, accent: stage.accent, type: null, showValue: true };
  });

  const links: PipelineFlowLink[] = [];
  for (const [edge, value] of transitionCounts) {
    const [from, to] = edge.split('>>');
    const source = nodeIndexByKey.get(from);
    const target = nodeIndexByKey.get(to);
    if (source == null || target == null) continue;
    links.push({ source, target, value });
  }

  // Legend: the types actually present, in taxonomy order (plus Unknown if any).
  const typesPresent = new Set(nodes.map((node) => node.type).filter((type): type is string => Boolean(type)));
  const legend: PipelineFlowLegendEntry[] = submissionTypeTaxonomy
    .filter((type) => typesPresent.has(type.code))
    .map((type) => ({ code: type.code, label: type.label, color: FLOW_TYPE_COLOR[type.code] ?? FLOW_TYPE_COLOR.unknown }));
  if (typesPresent.has('unknown')) legend.push({ code: 'unknown', label: 'Unknown', color: FLOW_TYPE_COLOR.unknown });

  const totalTransitions = links.reduce((sum, link) => sum + link.value, 0);

  return {
    config: {
      eyebrow: 'Pipeline monitor',
      title: 'Pipeline Flow',
      description: 'How submissions flow through the complete pipeline. After Submission Type the flow splits into one coloured lane per submission type (see legend) — each runs only the stages on its route. Flow width is the number of submissions that made each transition.',
    },
    nodes,
    links,
    legend,
    summary: [
      { label: 'Submissions tracked', value: submissionIds.length, meta: 'Submissions with pipeline history in this org.', format: 'number' },
      { label: 'Stage transitions', value: totalTransitions, meta: 'Total forward stage moves across all submissions.', format: 'number' },
      { label: 'Reached final stage', value: completed, meta: 'Submissions that flowed through to the last stage.', format: 'number' },
      { label: 'Latest event failed', value: failed, meta: 'Submissions whose most recent stage failed.', format: 'number' },
    ],
    refreshedAt: new Date().toISOString(),
  };
}

// Maps a pipeline stage to the service that runs it. (Ingestion has no runner —
// it is the entry point, never a "next" stage to advance into.)
const STAGE_RUNNERS: Record<string, (payload: unknown) => Promise<Record<string, unknown>>> = {
  ocr: (payload) => new OcrService().process(payload, { onSuccess: persistOcrResult }),
  submissionType: (payload) => new SubmissionTypeService().process(payload),
  classification: (payload) => new ClassificationService().process(payload),
  assignment: (payload) => new AssignmentService().process(payload),
  extraction: (payload) => new ExtractionService().process(payload),
  insuredSubject: (payload) => new InsuredSubjectService().process(payload),
  locationDiscovery: (payload) => new LocationDiscoveryService().process(payload),
  normalization: (payload) => new NormalizationService().process(payload),
  validation: (payload) => new ValidationService().process(payload),
  schemaGeneration: (payload) => new SchemaGenerationService().process(payload),
  // The Rating & Workflow lane runs the full underwriting sub-chain the workflow
  // decision consumes (this lane's event keys have always claimed pre-rating /
  // capacity / oracle-attestation — now it actually runs them). Each sub-stage's
  // output is threaded into the next and embedded in the lane's recorded output
  // artifact so the chain stays auditable.
  workflow: async (payload) => {
    const base = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
    const preRating = await new PreRatingService().process(base);
    const capacityMatch = await new CapacityMatchService().process({ ...base, preRating });
    const oracleAttestation = await new OracleAttestationService().process({ ...base, preRating, capacityMatch });
    const result = await new WorkflowService().process({ ...base, preRating, capacityMatch, oracleAttestation });
    return { ...result, preRating, capacityMatch, oracleAttestation };
  },
  // Slice 5.4 — additive runner. Wraps the existing compute spine; total/guarded.
  riskCompute: (payload) => new RiskComputeService().process(payload),
  // Close-the-loop Issue 1 — runs sanctions + carrier-licensing screening and
  // persists a ComplianceClearance. Total/guarded (never throws out of process).
  preBindCompliance: (payload) => new PreBindComplianceService().process(payload),
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
  /** The submission-type route this transition was resolved under ('default' = full path). */
  routeKey: string | null;
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
  routeKey: string | null = null,
): Promise<AdvanceSubmissionResult> {
  // Open/reuse the replayable run and assemble this stage's input from the prior
  // stages' recorded outputs. Best-effort: if playback capture is unavailable
  // (e.g. the migration hasn't run) the stage still executes — it just receives
  // the bare submission, exactly as before.
  let prepared: Awaited<ReturnType<typeof prepareStageRun>> | null = null;
  try {
    prepared = await prepareStageRun({
      submissionId: submission.id,
      organizationId: submission.organizationId ?? null,
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
    submission: { id: submission.id, organizationId: submission.organizationId },
    ...(prepared?.priorOutputs ?? {}),
  };

  let errorMessage: string | null = null;
  let warnings: string[] = [];
  let signals: Record<string, unknown> = {};
  let ranOk = true;
  let result: Record<string, unknown> | undefined;
  const startedAt = new Date();
  const runner = STAGE_RUNNERS[targetStage.key];
  // Capture every LLM agent call the stage makes (prompt sent, raw response) so
  // the board can show the agent transcript — live while the stage runs, and
  // persisted alongside the execution afterwards.
  const traceCapture = createAgentTraceCapture({ submissionId: submission.id, stageKey: targetStage.key });
  if (runner) {
    try {
      result = await traceCapture.run(() => runner(inputPayload));
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
        organizationId: submission.organizationId ?? null,
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
      // Persist the agent transcript next to the execution (best-effort, like
      // the artifact capture itself).
      try {
        await recordAgentTraces({
          runId: recorded.runId,
          executionId: recorded.executionId,
          submissionId: submission.id,
          organizationId: submission.organizationId ?? null,
          stageKey: targetStage.key,
          traces: traceCapture.traces,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(
          `playback: recordAgentTraces failed for submission ${submission.id}:`,
          err instanceof Error ? err.message : err,
        );
      }
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
    organizationId: submission.organizationId ?? null,
    stage: targetStage.key,
    status: ranOk ? 'completed' : 'failed',
    inputRef,
    outputRef,
    errorMessage,
    metadata: { trigger, runId, ...(routeKey ? { route: routeKey } : {}), ...(warnings.length ? { warnings } : {}), ...signals },
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
    routeKey,
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
 * fallback), then advances WITHIN the submission's type-specific route rather
 * than down one global linear order — so a claim, endorsement, or cancellation
 * skips the new-business stages that don't apply to it. The route is resolved
 * best-effort and falls back to the full default path (see `resolveSubmissionRoute`).
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
  const route = await resolveSubmissionRoute({ id: submission.id, organizationId: submission.organizationId });
  const nextKey = nextStageKeyInRoute(route.keys, currentKey);
  const currentStage = STAGE_BY_KEY.get(currentKey) ?? PIPELINE_STAGES[0];
  const nextStage = nextKey ? STAGE_BY_KEY.get(nextKey) : undefined;

  if (!nextStage) {
    return { error: 'already_at_final_stage', code: 400 };
  }

  return executeStageTransition(submission, currentStage, nextStage, 'manual', route.routeKey);
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

  // Feed the re-run the outputs of the stage that precedes the target IN ITS
  // ROUTE (which may differ from the global order when stages are trimmed).
  const route = await resolveSubmissionRoute({ id: submission.id, organizationId: submission.organizationId });
  const fromStage = STAGE_BY_KEY.get(prevStageKeyInRoute(route.keys, targetStage.key)) ?? targetStage;
  return executeStageTransition(submission, fromStage, targetStage, 'rerun', route.routeKey);
}
