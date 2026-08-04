import type { FastifyRequest } from 'fastify';
import { Op } from 'sequelize';
import { IngestionEvent, InsurerProfile, Submission, SubmissionOutput } from '../../../db/models';
import { submissionTypeTaxonomy } from '../../../db/seed-data/submissionTypeTaxonomy';
import { resolveOrganizationIdFromRequest } from '../../lib/org';
import { humanize } from '../../lib/boardFormat';
import {
  FINAL_STAGE_KEY,
  PIPELINE_STAGE_DEFINITIONS,
  stageForKey,
  stageKeyForEvent,
} from '../stages/registry';

export type PipelineFlowNode = {
  key: string;
  label: string;
  accent: string;
  type?: string | null;
  typeLabel?: string | null;
  showValue?: boolean;
};
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

const STAGE_ORDER_INDEX = new Map(PIPELINE_STAGE_DEFINITIONS.map((stage, index) => [stage.key, index]));
const FLOW_FORK_INDEX = STAGE_ORDER_INDEX.get('submissionType') ?? 2;
const FAILED_EVENT_STATUSES = new Set(['failed', 'error', 'dead', 'dlq', 'rejected']);
const FLOW_TYPE_COLOR: Record<string, string> = {
  new_business: '#4ade80', renewal: '#38bdf8', quote_request: '#a78bfa', endorsement: '#fbbf24',
  cancellation: '#fb7185', claim: '#f97316', audit: '#2dd4bf', treaty_reinsurance: '#c084fc',
  facultative_reinsurance: '#f472b6', inquiry: '#94a3b8', unknown: '#64748b',
};
const SUBMISSION_TYPE_LABEL = new Map(submissionTypeTaxonomy.map((type) => [type.code, type.label]));

function flowNodeKey(stageKey: string, type: string): string {
  const index = STAGE_ORDER_INDEX.get(stageKey);
  return index != null && index <= FLOW_FORK_INDEX ? stageKey : `${type}::${stageKey}`;
}

function parseFlowNodeKey(key: string): { stageKey: string; type: string | null } {
  const separator = key.indexOf('::');
  return separator === -1 ? { stageKey: key, type: null } : { type: key.slice(0, separator), stageKey: key.slice(separator + 2) };
}

function isFailed(event: IngestionEvent): boolean {
  return Boolean(event.errorMessage) || FAILED_EVENT_STATUSES.has(String(event.status ?? '').toLowerCase());
}

/** Read-only Sankey projection. Execution commands deliberately live elsewhere. */
export async function buildPipelineFlow(request: FastifyRequest): Promise<PipelineFlowResponse> {
  const organizationId = await resolveOrganizationIdFromRequest(request);
  const insurerInclude = organizationId
    ? { model: InsurerProfile, as: 'insurerProfile', required: true, where: { organizationId } }
    : { model: InsurerProfile, as: 'insurerProfile' };
  const submissions = await Submission.findAll({
    where: { status: { [Op.ne]: 'rejected' } }, include: [insurerInclude] as never, attributes: ['id'],
  });
  const submissionIds = submissions.map((submission) => submission.id);
  const transitionCounts = new Map<string, number>();
  const presentKeys = new Set<string>();
  let completed = 0;
  let failed = 0;

  if (submissionIds.length > 0) {
    const typeBySubmission = new Map<number, string>();
    const outputs = await SubmissionOutput.findAll({
      where: { submissionId: { [Op.in]: submissionIds } }, attributes: ['submissionId', 'structuredData'], order: [['id', 'DESC']],
    });
    for (const output of outputs) {
      if (output.submissionId == null || typeBySubmission.has(output.submissionId)) continue;
      const data = output.structuredData as { submissionTypeCode?: unknown; canonical?: { submissionType?: { code?: unknown } } } | null;
      const type = data?.canonical?.submissionType?.code ?? data?.submissionTypeCode;
      if (typeof type === 'string' && type) typeBySubmission.set(output.submissionId, type);
    }

    const events = await IngestionEvent.findAll({
      attributes: ['id', 'submissionId', 'stage', 'status', 'errorMessage', 'metadata', 'createdAt'],
      where: { submissionId: { [Op.in]: submissionIds } }, order: [['submissionId', 'ASC'], ['createdAt', 'ASC'], ['id', 'ASC']],
    });
    const sequenceBySubmission = new Map<number, string[]>();
    const failedBySubmission = new Map<number, boolean>();
    for (const event of events) {
      if (event.submissionId == null) continue;
      const stageKey = stageKeyForEvent(event.stage);
      if (!stageKey) continue;
      const sequence = sequenceBySubmission.get(event.submissionId) ?? [];
      if (sequence.at(-1) !== stageKey) sequence.push(stageKey);
      sequenceBySubmission.set(event.submissionId, sequence);
      failedBySubmission.set(event.submissionId, isFailed(event));
      const route = (event.metadata as { route?: unknown } | null)?.route;
      if (!typeBySubmission.has(event.submissionId) && typeof route === 'string' && route) typeBySubmission.set(event.submissionId, route);
    }
    for (const [submissionId, sequence] of sequenceBySubmission) {
      const type = typeBySubmission.get(submissionId) ?? 'unknown';
      for (let index = 0; index < sequence.length - 1; index += 1) {
        const from = sequence[index];
        const to = sequence[index + 1];
        const fromIndex = STAGE_ORDER_INDEX.get(from);
        const toIndex = STAGE_ORDER_INDEX.get(to);
        if (fromIndex == null || toIndex == null || toIndex <= fromIndex) continue;
        const edge = `${flowNodeKey(from, type)}>>${flowNodeKey(to, type)}`;
        presentKeys.add(edge.split('>>')[0]);
        presentKeys.add(edge.split('>>')[1]);
        transitionCounts.set(edge, (transitionCounts.get(edge) ?? 0) + 1);
      }
      if (sequence.includes(FINAL_STAGE_KEY)) completed += 1;
      if (failedBySubmission.get(submissionId)) failed += 1;
    }
  }

  const parsed = [...presentKeys].map((key) => ({ key, ...parseFlowNodeKey(key) })).sort((a, b) =>
    (STAGE_ORDER_INDEX.get(a.stageKey) ?? 0) - (STAGE_ORDER_INDEX.get(b.stageKey) ?? 0)
      || String(a.type ?? '').localeCompare(String(b.type ?? '')),
  );
  const nodeIndex = new Map(parsed.map((node, index) => [node.key, index]));
  const nodes = parsed.map((node): PipelineFlowNode => {
    const stage = stageForKey(node.stageKey)!;
    return node.type
      ? { key: node.key, label: stage.label, accent: FLOW_TYPE_COLOR[node.type] ?? FLOW_TYPE_COLOR.unknown, type: node.type, typeLabel: SUBMISSION_TYPE_LABEL.get(node.type) ?? humanize(node.type), showValue: false }
      : { key: node.key, label: stage.label, accent: stage.accent, type: null, showValue: true };
  });
  const links = [...transitionCounts].flatMap(([edge, value]) => {
    const [from, to] = edge.split('>>');
    const source = nodeIndex.get(from);
    const target = nodeIndex.get(to);
    return source == null || target == null ? [] : [{ source, target, value }];
  });
  const typesPresent = new Set(nodes.map((node) => node.type).filter((type): type is string => Boolean(type)));
  const legend = submissionTypeTaxonomy.filter((type) => typesPresent.has(type.code)).map((type) => ({
    code: type.code, label: type.label, color: FLOW_TYPE_COLOR[type.code] ?? FLOW_TYPE_COLOR.unknown,
  }));
  if (typesPresent.has('unknown')) legend.push({ code: 'unknown', label: 'Unknown', color: FLOW_TYPE_COLOR.unknown });

  return {
    config: { eyebrow: 'Pipeline monitor', title: 'Pipeline Flow', description: 'How submissions progress through the configured pipeline. After Submission Type, the flow splits by transaction type.' },
    nodes, links, legend,
    summary: [
      { label: 'Submissions tracked', value: submissionIds.length, meta: 'Submissions with pipeline history in this org.', format: 'number' },
      { label: 'Stage transitions', value: links.reduce((sum, link) => sum + link.value, 0), meta: 'Total forward stage moves across all submissions.', format: 'number' },
      { label: 'Reached final stage', value: completed, meta: 'Submissions that flowed through to the final stage.', format: 'number' },
      { label: 'Latest event failed', value: failed, meta: 'Submissions whose latest stage failed.', format: 'number' },
    ],
    refreshedAt: new Date().toISOString(),
  };
}
