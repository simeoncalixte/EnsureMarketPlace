import { FastifyPluginAsync } from 'fastify';
import { CanonicalSubmission, InsurerProfile, ModelRun, Organization, Pricing, PricingVersion, RiskPortfolio, Submission, TriageResult, User, WorkflowState } from '../db/models';
import { resolveOrganizationIdFromRequest } from '../lib/org';

type SubmissionPriority = 'urgent' | 'high' | 'normal';
type SubmissionStageKey = 'intake' | 'analysis' | 'pricing' | 'closed';

type BoardFieldFormat = 'text' | 'currency' | 'number' | 'date' | 'badge';
type BoardFieldSection = 'facts' | 'body';

type BoardFieldDefinition = {
  key: string;
  label: string;
  valueKey: string;
  format?: BoardFieldFormat;
  section?: BoardFieldSection;
  badgeSource?: 'priority' | 'stage';
};

type BoardHeaderDefinition = {
  titleFieldKey: string;
  subtitleFieldKey?: string;
  badgeFieldKey?: string;
};

type BoardStageDefinition = {
  key: SubmissionStageKey | string;
  label: string;
  statuses: string[];
  accent: string;
  background: string;
  border: string;
  description: string;
  emptyState: string;
};

type BoardConfig = {
  eyebrow: string;
  title: string;
  description: string;
  header: BoardHeaderDefinition;
  tableColumns: BoardFieldDefinition[];
  cardFields: BoardFieldDefinition[];
  stages: BoardStageDefinition[];
};

function collectAllowedStatuses(config: BoardConfig): string[] {
  return Array.from(new Set(config.stages.flatMap((stage) => stage.statuses))).filter((status): status is string => Boolean(status));
}

type DashboardSummaryCard = {
  label: string;
  value: number;
  meta: string;
  format: 'number' | 'currency';
};

type DashboardItem = {
  id: number;
  status: string;
  stageKey: string;
  stageLabel: string;
  stageAccent: string;
  stageBackground: string;
  stageBorder: string;
  nextStatus: string | null;
  nextStageKey: string | null;
  nextStageLabel: string | null;
  nextStageAccent: string | null;
  priority: SubmissionPriority;
  values: Record<string, string | number | null>;
};

type DashboardResponse = {
  config: BoardConfig;
  summary: DashboardSummaryCard[];
  items: DashboardItem[];
  refreshedAt: string;
};

const DEFAULT_BOARD_CONFIG: BoardConfig = {
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

function normalizeBoardConfig(raw: unknown): BoardConfig {
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function humanize(value: string | null | undefined): string {
  if (!value) {
    return 'Unspecified';
  }

  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatRelativeTime(dateLike: Date | string | null | undefined): string {
  if (!dateLike) {
    return 'Recently';
  }

  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));
  if (diffMinutes < 1) {
    return 'Just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function normalizeScore(score: unknown): number | null {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  if (numeric > 1) {
    return Math.max(0, Math.min(1, numeric / 100));
  }

  return Math.max(0, Math.min(1, numeric));
}

function computePriority(args: { triageScore?: unknown; premium: number; exposure: number; status: string }): SubmissionPriority {
  const normalizedScore = normalizeScore(args.triageScore);
  if (normalizedScore !== null) {
    if (normalizedScore <= 0.35) {
      return 'urgent';
    }

    if (normalizedScore <= 0.65) {
      return 'high';
    }
  }

  if (args.status === 'submitted' || args.status === 'draft') {
    if (args.premium >= 12000000 || args.exposure >= 220000000) {
      return 'urgent';
    }

    if (args.premium >= 6000000 || args.exposure >= 120000000) {
      return 'high';
    }
  }

  if (args.status === 'modeling' && (args.premium >= 8000000 || args.exposure >= 150000000)) {
    return 'high';
  }

  return 'normal';
}

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
  const [modelRun, triageResult, pricing, canonicalSubmission] = await Promise.all([
    ModelRun.findOne({ where: { submissionId: submission.id }, order: [['createdAt', 'DESC']] }),
    TriageResult.findOne({ where: { submissionId: submission.id }, order: [['decidedAt', 'DESC'], ['id', 'DESC']] }),
    Pricing.findOne({ where: { submissionId: submission.id } }),
    CanonicalSubmission.findOne({ where: { submissionId: submission.id } }),
  ]);

  const pricingVersion = pricing
    ? await PricingVersion.findOne({ where: { pricingId: pricing.id }, order: [['versionNumber', 'DESC']] })
    : null;

  const portfolio = submission.portfolio as RiskPortfolio | null | undefined;
  const insurerProfile = submission.insurerProfile as InsurerProfile | null | undefined;
  const insurerOrganization = insurerProfile?.organization as Organization | null | undefined;
  const submittingUser = submission.submittedBy as User | null | undefined;
  const workflowState = submission.workflowState as WorkflowState | null | undefined;
  const workflowAssignee = workflowState?.assignedToUser as User | null | undefined;

  const premiumSource = Number(pricingVersion?.premium ?? portfolio?.totalPremium ?? 0);
  const exposureSource = Number(portfolio?.totalExposure ?? 0);
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
    receivedAt: submission.receivedAt ? new Date(submission.receivedAt).toISOString() : null,
    canonicalSummary: canonicalSubmission?.data ? 'Available' : null,
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

async function buildDashboard(request: Parameters<typeof resolveOrganizationIdFromRequest>[0]): Promise<DashboardResponse> {
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

export const underwritingSubmissionsRoute: FastifyPluginAsync = async (app) => {
  app.get(
    '/underwriting/submissions',
    {
      schema: {
        description: 'Return the live underwriting submissions dashboard for the current organization.',
      },
    },
    async (request, reply) => reply.code(200).send(await buildDashboard(request)),
  );

  app.put(
    '/underwriting/submissions/config',
    {
      schema: {
        description: 'Update the underwriting board configuration for the current organization.',
        body: {
          type: 'object',
          additionalProperties: true,
        },
      },
    },
    async (request, reply) => {
      const organizationId = await resolveOrganizationIdFromRequest(request);
      if (!organizationId) {
        return reply.code(400).send({ error: 'organization_required' });
      }

      const organization = await Organization.findByPk(organizationId);
      if (!organization) {
        return reply.code(404).send({ error: 'organization_not_found' });
      }

      await organization.update({ submissionBoardConfig: request.body as Record<string, unknown> });
      const dashboard = await buildDashboard(request);
      return reply.code(200).send(dashboard.config);
    },
  );

  app.patch(
    '/underwriting/submissions/:id/status',
    {
      schema: {
        description: 'Advance a submission to another backend-configured stage.',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'integer' },
          },
        },
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', minLength: 1 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const organizationId = await resolveOrganizationIdFromRequest(request);
      const organization = organizationId ? await Organization.findByPk(organizationId) : null;
      const config = normalizeBoardConfig(organization?.submissionBoardConfig ?? null);
      const allowedStatuses = collectAllowedStatuses(config);
      const { id } = request.params as { id: number };
      const { status } = request.body as { status: string };

      if (!allowedStatuses.includes(status)) {
        return reply.code(400).send({ error: 'status_not_enabled', allowedStatuses });
      }

      const where: Record<string, unknown> = { id };
      const include: Array<Record<string, unknown>> = [];

      if (organizationId) {
        include.push({
          model: InsurerProfile,
          as: 'insurerProfile',
          required: true,
          where: { organizationId },
          include: [{ model: Organization, as: 'organization' }],
        });
      }

      const submission = await Submission.findOne({ where, include });
      if (!submission) {
        return reply.code(404).send({ error: 'submission_not_found' });
      }

      await submission.update({ status });

      const [workflowState] = await WorkflowState.findOrCreate({
        where: { submissionId: submission.id },
        defaults: {
          submissionId: submission.id,
          tenantId: submission.tenantId ?? null,
          status,
          assignedTo: submission.submittedByUserId ?? null,
          tasks: null,
        },
      });

      await workflowState.update({ status, tenantId: submission.tenantId ?? null });

      const dashboard = await buildDashboard(request);
      const item = dashboard.items.find((entry) => entry.id === submission.id);
      return reply.code(200).send(item ?? { ok: true });
    },
  );
};

export default underwritingSubmissionsRoute;