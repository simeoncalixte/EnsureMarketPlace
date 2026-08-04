import { CanonicalSubmission, ComplianceClearance, InsurerProfile, ModelRun, Organization, Policy, Pricing, PricingVersion, Quote, QuoteVersion, RiskPortfolio, Submission, TriageResult, User, WorkflowState } from '../../db/models';
import { resolveOrganizationIdFromRequest } from '../../services/lib/org';
import { computePriority, formatCurrency, formatRelativeTime, humanize } from '../../services/lib/boardFormat';
import {
  BoardConfig,
  BoardHeaderDefinition,
  BoardStageDefinition,
  DashboardItem,
  DashboardResponse,
} from './types';

/**
 * Statuses that represent a quote/bind-ready outcome. A submission cannot be moved
 * into one of these until its latest pre-bind ComplianceClearance is `passed`
 * (close-the-loop Issue 1: "quote issuance blocked without it"). The gate is
 * enforced server-side in the PATCH handler.
 */
export const COMPLIANCE_GATED_STATUSES = new Set(['approved']);

/** Human-readable reason for a blocked clearance, surfaced to the underwriter. */
export function complianceBlockReason(clearance: ComplianceClearance | null): string {
  if (!clearance) {
    return 'Pre-bind compliance has not been run for this submission yet.';
  }
  if (clearance.status === 'failed') {
    const blocking = clearance.checksJson
      .filter((check) => check.status === 'hit' || check.status === 'not_authorized')
      .map((check) => check.detail);
    return blocking.length > 0 ? blocking.join(' ') : 'Pre-bind compliance failed.';
  }
  if (clearance.status === 'review') {
    return 'Pre-bind compliance needs manual review before bind.';
  }
  return 'Pre-bind compliance is pending.';
}

export function collectAllowedStatuses(config: BoardConfig): string[] {
  return Array.from(new Set(config.stages.flatMap((stage) => stage.statuses))).filter((status): status is string => Boolean(status));
}

export const DEFAULT_BOARD_CONFIG: BoardConfig = {
  eyebrow: 'Underwriting queue',
  title: 'Incoming Submissions',
  description: 'Backend-configured live submissions board with configurable lanes, card content, and actions.',
  header: {
    titleFieldKey: 'submissionNumber',
    subtitleFieldKey: 'cedent',
    badgeFieldKey: 'priority',
  },
  tableColumns: [
    { key: 'submissionNumber', label: 'Submission', valueKey: 'submissionNumber' },
    { key: 'cedent', label: 'Cedent', valueKey: 'cedent' },
    { key: 'lineOfBusiness', label: 'Line of Business', valueKey: 'lineOfBusiness' },
    { key: 'region', label: 'Region', valueKey: 'region' },
    { key: 'exposure', label: 'Exposure', valueKey: 'exposure', format: 'currency' },
    { key: 'premium', label: 'Premium', valueKey: 'premium', format: 'currency' },
    { key: 'priority', label: 'Priority', valueKey: 'priority', format: 'badge', badgeSource: 'priority' },
    { key: 'compliance', label: 'Compliance', valueKey: 'complianceStatus', format: 'badge' },
    { key: 'receivedLabel', label: 'Received', valueKey: 'receivedLabel' },
    { key: 'owner', label: 'Owner', valueKey: 'owner' },
    { key: 'stageLabel', label: 'Stage', valueKey: 'stageLabel', format: 'badge', badgeSource: 'stage' },
    { key: 'source', label: 'Source', valueKey: 'source' },
  ],
  cardFields: [
    { key: 'lineOfBusiness', label: 'Line of Business', valueKey: 'lineOfBusiness', section: 'facts' },
    { key: 'region', label: 'Region', valueKey: 'region', section: 'facts' },
    { key: 'exposure', label: 'Exposure', valueKey: 'exposure', format: 'currency', section: 'facts' },
    { key: 'premium', label: 'Premium', valueKey: 'premium', format: 'currency', section: 'facts' },
    { key: 'compliance', label: 'Compliance', valueKey: 'complianceStatus', format: 'badge', section: 'facts' },
    { key: 'owner', label: 'Owner', valueKey: 'owner', section: 'facts' },
    { key: 'receivedLabel', label: 'Received', valueKey: 'receivedLabel', section: 'facts' },
    { key: 'source', label: 'Source', valueKey: 'source', section: 'body' },
    { key: 'notes', label: 'Notes', valueKey: 'notes', section: 'body' },
  ],
  stages: [
    {
      key: 'intake',
      label: 'Intake',
      statuses: ['draft', 'submitted'],
      accent: '#4b8eff',
      background: 'rgba(75, 142, 255, 0.12)',
      border: 'rgba(75, 142, 255, 0.28)',
      description: 'Fresh submissions entering the pipeline.',
      emptyState: 'No intake submissions yet.',
    },
    {
      key: 'analysis',
      label: 'Analysis',
      statuses: ['modeling'],
      accent: '#f59e0b',
      background: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.28)',
      description: 'Modeling, validation, and underwriting review.',
      emptyState: 'No submissions in analysis yet.',
    },
    {
      key: 'pricing',
      label: 'Pricing',
      statuses: ['priced'],
      accent: '#22c55e',
      background: 'rgba(34, 197, 94, 0.12)',
      border: 'rgba(34, 197, 94, 0.28)',
      description: 'Pricing and terms are being finalized.',
      emptyState: 'No submissions in pricing yet.',
    },
    {
      key: 'compliance',
      label: 'Pre-bind Compliance',
      statuses: ['compliance'],
      accent: '#f87171',
      background: 'rgba(248, 113, 113, 0.12)',
      border: 'rgba(248, 113, 113, 0.28)',
      description: 'Sanctions and carrier-licensing checks before a quote can be bound.',
      emptyState: 'No submissions awaiting compliance yet.',
    },
    {
      key: 'closed',
      label: 'Closed',
      statuses: ['approved', 'rejected'],
      accent: '#a78bfa',
      background: 'rgba(167, 139, 250, 0.12)',
      border: 'rgba(167, 139, 250, 0.28)',
      description: 'Approved and declined submissions ready for downstream action.',
      emptyState: 'No closed submissions yet.',
    },
  ],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeDefinitions<T extends { key: string }>(defaults: T[], custom: unknown): T[] {
  if (!Array.isArray(custom) || custom.length === 0) {
    return defaults;
  }

  return custom.map((entry, index) => {
    const customEntry = isRecord(entry) ? (entry as Partial<T> & { key?: string }) : {};
    const base = defaults.find((item) => item.key === customEntry.key) ?? defaults[index] ?? {};
    return { ...(base as Record<string, unknown>), ...(customEntry as Record<string, unknown>) } as T;
  });
}

export function normalizeBoardConfig(raw: unknown): BoardConfig {
  const config = isRecord(raw) ? raw : {};
  const normalized = { ...DEFAULT_BOARD_CONFIG, ...config } as BoardConfig;

  normalized.header = {
    ...DEFAULT_BOARD_CONFIG.header,
    ...(isRecord(config.header) ? (config.header as Partial<BoardHeaderDefinition>) : {}),
  };
  normalized.tableColumns = mergeDefinitions(DEFAULT_BOARD_CONFIG.tableColumns, config.tableColumns);
  normalized.cardFields = mergeDefinitions(DEFAULT_BOARD_CONFIG.cardFields, config.cardFields);
  normalized.stages = mergeDefinitions(DEFAULT_BOARD_CONFIG.stages, config.stages);

  return normalized;
}

// Currency/relative-time/humanize formatters and priority scoring now live in
// `../lib/boardFormat` so the pipeline-processing board can reuse them.

function resolveStageIndex(status: string, stages: BoardStageDefinition[]): number {
  const index = stages.findIndex((stage) => stage.statuses.includes(status));
  return index >= 0 ? index : 0;
}

function resolveStageForStatus(status: string, stages: BoardStageDefinition[]): BoardStageDefinition {
  return stages[resolveStageIndex(status, stages)] ?? stages[0] ?? DEFAULT_BOARD_CONFIG.stages[0];
}

function resolveNextStage(currentStageIndex: number, stages: BoardStageDefinition[]): BoardStageDefinition | null {
  return stages[currentStageIndex + 1] ?? null;
}

function primaryStatusForStage(stage: BoardStageDefinition | null | undefined): string | null {
  return stage?.statuses?.[0] ?? null;
}

async function loadLiveItem(submission: Submission, config: BoardConfig): Promise<DashboardItem> {
  const [modelRun, triageResult, pricing, canonicalSubmission, complianceClearance] = await Promise.all([
    ModelRun.findOne({ where: { submissionId: submission.id }, order: [['createdAt', 'DESC']] }),
    TriageResult.findOne({ where: { submissionId: submission.id }, order: [['decidedAt', 'DESC'], ['id', 'DESC']] }),
    Pricing.findOne({ where: { submissionId: submission.id } }),
    CanonicalSubmission.findOne({ where: { submissionId: submission.id } }),
    // Latest pre-bind compliance clearance (append-only — newest row is current).
    ComplianceClearance.findOne({ where: { submissionId: submission.id }, order: [['createdAt', 'DESC'], ['id', 'DESC']] }),
  ]);

  const pricingVersion = pricing
    ? await PricingVersion.findOne({ where: { pricingId: pricing.id }, order: [['versionNumber', 'DESC']] })
    : null;

  // Close-the-loop Issue 2 — quote + bound-policy state, projected onto the board
  // row by submissionId (the same denormalization the pricing/compliance fields
  // use). Null-safe: submissions with no quote/policy render exactly as before.
  const quote = await Quote.findOne({ where: { submissionId: submission.id } });
  const quoteVersion = quote
    ? await QuoteVersion.findOne({ where: { quoteId: quote.id }, order: [['versionNumber', 'DESC']] })
    : null;
  const policy = quote?.boundPolicyId
    ? await Policy.findByPk(quote.boundPolicyId)
    : await Policy.findOne({ where: { submissionId: submission.id }, order: [['createdAt', 'DESC']] });

  const portfolio = submission.portfolio as RiskPortfolio | null | undefined;
  const insurerProfile = submission.insurerProfile as InsurerProfile | null | undefined;
  const insurerOrganization = insurerProfile?.organization as Organization | null | undefined;
  const submittingUser = submission.submittedBy as User | null | undefined;
  const workflowState = submission.workflowState as WorkflowState | null | undefined;
  const workflowAssignee = workflowState?.assignedToUser as User | null | undefined;

  const premiumSource = Number(pricingVersion?.premium ?? portfolio?.totalPremium ?? 0);
  const exposureSource = Number(portfolio?.totalExposure ?? 0);

  // Slice 5.4 — additively surface the compute spine's provenance to the board.
  // The latest PricingVersion.assumptionsJson IS the persisted ComputeProvenance
  // (see pipeline/compute/service.ts). Read it null-safely so legacy submissions
  // (seed-priced rows without a compute run, or a pricingVersion authored before
  // 5.4) render exactly as before — every new field falls back to null.
  const provenance =
    pricingVersion?.assumptionsJson && typeof pricingVersion.assumptionsJson === 'object'
      ? (pricingVersion.assumptionsJson as Record<string, unknown>)
      : null;
  const provenanceParametric =
    provenance && typeof provenance.parametric === 'object' && provenance.parametric !== null
      ? (provenance.parametric as Record<string, unknown>)
      : null;
  const confidenceLabel =
    provenance && typeof provenance.confidenceLabel === 'string' ? provenance.confidenceLabel : null;
  const rateOnLine =
    provenanceParametric && typeof provenanceParametric.rateOnLine === 'number'
      ? provenanceParametric.rateOnLine
      : null;
  // expectedLoss: prefer the persisted ModelRun, fall back to the provenance blend.
  const blendDetail =
    provenance && typeof provenance.blendDetail === 'object' && provenance.blendDetail !== null
      ? (provenance.blendDetail as Record<string, unknown>)
      : null;
  const blendedLoss =
    blendDetail && typeof blendDetail.blended === 'number' ? blendDetail.blended : null;
  const expectedLoss =
    modelRun?.expectedLoss != null
      ? Number(modelRun.expectedLoss)
      : blendedLoss;
  const priorSource =
    provenance && typeof provenance.priorSource === 'string' ? provenance.priorSource : null;
  const stage = resolveStageForStatus(String(submission.status), config.stages);
  const stageIndex = resolveStageIndex(String(submission.status), config.stages);
  const nextStage = resolveNextStage(stageIndex, config.stages);
  const nextStatus = primaryStatusForStage(nextStage);

  const modelVersion = modelRun?.modelVersion ?? null;
  const ownerName = [workflowAssignee?.firstName, workflowAssignee?.lastName].filter(Boolean).join(' ').trim()
    || [submittingUser?.firstName, submittingUser?.lastName].filter(Boolean).join(' ').trim()
    || submittingUser?.email
    || 'Unassigned';

  const notes = triageResult?.decision
    ? `Triage decision: ${triageResult.decision}`
    : pricingVersion
      ? `Pricing version ${pricingVersion.versionNumber} is available.`
      : modelVersion
        ? `Model ${modelVersion} completed and ready for review.`
        : `Live submission from ${humanize(submission.source ?? submission.transport ?? 'system')}`;

  const values: Record<string, string | number | null> = {
    submissionNumber: `SUB-${String(submission.id).padStart(4, '0')}`,
    submissionId: submission.id,
    cedent: insurerOrganization?.name ?? insurerProfile?.id?.toString() ?? 'Unspecified cedent',
    lineOfBusiness: humanize(portfolio?.perilType ?? portfolio?.name ?? null),
    portfolioName: portfolio?.name ?? null,
    region: portfolio?.region ?? 'Unspecified',
    exposure: exposureSource,
    premium: premiumSource,
    receivedLabel: formatRelativeTime(submission.receivedAt ?? submission.createdAt),
    owner: ownerName,
    source: humanize(submission.source ?? submission.transport ?? 'system'),
    notes,
    status: submission.status,
    stageLabel: stage.label,
    stageKey: stage.key,
    triageDecision: triageResult?.decision ?? null,
    triageScore: triageResult?.score ?? null,
    modelVersion,
    pricingVersion: pricingVersion?.versionNumber ?? null,
    // Slice 5.4 — additive compute-spine fields (all null-safe for legacy rows).
    confidenceLabel,
    rateOnLine,
    expectedLoss,
    priorSource,
    receivedAt: submission.receivedAt ? new Date(submission.receivedAt).toISOString() : null,
    canonicalSummary: canonicalSubmission?.data ? 'Available' : null,
    // Close-the-loop Issue 1 — pre-bind compliance gate state (null-safe: legacy
    // rows with no clearance render as an em-dash, exactly as before).
    complianceStatus: complianceClearance?.status ?? null,
    complianceSanctions: complianceClearance?.sanctionsStatus ?? null,
    complianceLicensing: complianceClearance?.licensingStatus ?? null,
    complianceDetail: complianceClearance
      ? complianceClearance.status === 'passed'
        ? 'Cleared for bind.'
        : complianceBlockReason(complianceClearance)
      : null,
    complianceScreenedAt: complianceClearance?.screenedAt ? new Date(complianceClearance.screenedAt).toISOString() : null,
    // Close-the-loop Issue 2 — quote + policy state (null-safe for legacy rows).
    quoteNumber: quote?.quoteNumber ?? null,
    quoteStatus: quote?.status ?? null,
    quoteVersion: quoteVersion?.versionNumber ?? null,
    quotedPremium: quoteVersion?.premium != null ? Number(quoteVersion.premium) : null,
    quoteValidUntil: quoteVersion?.validUntil ? new Date(quoteVersion.validUntil).toISOString() : null,
    policyNumber: policy?.externalPolicyId ?? null,
    policyStatus: policy?.status ?? null,
    policyVersion: policy?.currentVersionNumber ?? null,
    priority: null,
  };

  const priority = computePriority({
    triageScore: triageResult?.score ?? null,
    premium: premiumSource,
    exposure: exposureSource,
    status: String(submission.status),
  });
  values.priority = priority;

  return {
    id: submission.id,
    status: String(submission.status),
    stageKey: stage.key,
    stageLabel: stage.label,
    stageAccent: stage.accent,
    stageBackground: stage.background,
    stageBorder: stage.border,
    nextStatus,
    nextStageKey: nextStage?.key ?? null,
    nextStageLabel: nextStage?.label ?? null,
    nextStageAccent: nextStage?.accent ?? null,
    priority,
    values,
  };
}

export async function buildDashboard(request: Parameters<typeof resolveOrganizationIdFromRequest>[0]): Promise<DashboardResponse> {
  const organizationId = await resolveOrganizationIdFromRequest(request);
  const organization = organizationId ? await Organization.findByPk(organizationId) : null;
  const config = normalizeBoardConfig(organization?.submissionBoardConfig ?? null);

  const include = [
    {
      model: InsurerProfile,
      as: 'insurerProfile',
      ...(organizationId
        ? {
            required: true,
            where: { organizationId },
            include: [{ model: Organization, as: 'organization' }],
          }
        : {
            include: [{ model: Organization, as: 'organization' }],
          }),
    },
    { model: RiskPortfolio, as: 'portfolio' },
    { model: User, as: 'submittedBy' },
    { model: WorkflowState, as: 'workflowState', include: [{ model: User, as: 'assignedToUser' }] },
  ] as const;

  // Live inbox across the WHOLE pipeline: the board surfaces every submission,
  // including ones still in-flight through the early/mid pipeline
  // (submissionType → classification → extraction → …) that have not been
  // canonicalized yet. Previously the board gated on a CanonicalSubmission row,
  // which is only written during the `normalization` stage — so a submission
  // dropped off the queue between intake and normalization and the board "lost
  // track" of it. Canonical fields are still surfaced per-item (null-safe) by
  // loadLiveItem, so canonicalized rows render exactly as before. Declined rows
  // still belong in the board's "Closed" lane, so we do NOT filter by status.
  // Tenant isolation is enforced by the InsurerProfile org join below.
  const submissions = await Submission.findAll({
    include: include as unknown as Parameters<typeof Submission.findAll>[0]['include'],
    order: [['receivedAt', 'DESC'], ['createdAt', 'DESC'], ['id', 'DESC']],
    distinct: true,
  });

  const items = await Promise.all(submissions.map((submission) => loadLiveItem(submission, config)));
  const finalStage = config.stages[config.stages.length - 1];
  const finalStageKey = finalStage?.key ?? null;

  const queueCount = items.length;
  const pendingCount = finalStageKey ? items.filter((item) => item.stageKey !== finalStageKey).length : queueCount;
  const urgentCount = items.filter((item) => item.priority === 'urgent').length;
  const totalPremium = items.reduce((sum, item) => sum + Number(item.values.premium ?? 0), 0);
  const averagePremium = queueCount > 0 ? totalPremium / queueCount : 0;

  return {
    config,
    summary: [
      {
        label: 'Queue volume',
        value: queueCount,
        meta: 'Submissions waiting in the underwriting queue.',
        format: 'number',
      },
      {
        label: 'Pending review',
        value: pendingCount,
        meta: 'Items still moving through the live board.',
        format: 'number',
      },
      {
        label: 'Urgent flags',
        value: urgentCount,
        meta: 'High-priority items that should be handled first.',
        format: 'number',
      },
      {
        label: 'Average premium',
        value: averagePremium,
        meta: `Total premium ${formatCurrency(totalPremium)} across the live queue.`,
        format: 'currency',
      },
    ],
    items,
    refreshedAt: new Date().toISOString(),
  };
}

/** Project a Policy row into the board/coverage summary DTO. */
export function policySummary(policy: Policy): {
  id: number;
  policyNumber: string;
  status: string | null;
  policyType: string;
  premium: number;
  coverageLimit: number | null;
  deductible: number | null;
  insuredValue: number | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  currentVersionNumber: number | null;
  submissionId: number | null;
  sourceQuoteId: number | null;
} {
  return {
    id: policy.id,
    policyNumber: policy.externalPolicyId,
    status: policy.status ?? null,
    policyType: policy.policyType,
    premium: Number(policy.premium),
    coverageLimit: policy.coverageLimit != null ? Number(policy.coverageLimit) : null,
    deductible: policy.deductible != null ? Number(policy.deductible) : null,
    insuredValue: policy.insuredValue != null ? Number(policy.insuredValue) : null,
    effectiveDate: policy.effectiveDate ? String(policy.effectiveDate) : null,
    expirationDate: policy.expirationDate ? String(policy.expirationDate) : null,
    currentVersionNumber: policy.currentVersionNumber ?? null,
    submissionId: policy.submissionId ?? null,
    sourceQuoteId: policy.sourceQuoteId ?? null,
  };
}
