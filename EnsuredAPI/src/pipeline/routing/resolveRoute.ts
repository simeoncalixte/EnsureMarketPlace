/**
 * DB-aware bridge between a persisted submission and the pure routing core
 * (`routes.ts`). Kept separate so the routing math stays unit-testable without a
 * database; everything here is best-effort and never throws — on any read error
 * the caller safely falls back to the full default route (legacy behaviour).
 */
import {
  OrganizationPipelineConfig,
  OrganizationPipelineConfigOperation,
  PipelineOperationCatalog,
  SubmissionOutput,
} from '../../db/models';
import { applyEnabledOverride, routeForType, type ResolvedRoute } from './routes';

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, unknown>;
}

/**
 * The submission-type code persisted by the `submissionType` stage (under
 * `SubmissionOutput.structuredData.submissionTypeCode`). Null when that stage has
 * not run yet — the resolver then uses the default route (whose shared prefix is
 * identical across every type, so early advances are unaffected).
 */
export async function loadSubmissionTypeCode(submissionId: number): Promise<string | null> {
  if (!(submissionId > 0)) return null;
  const document = await SubmissionOutput.findOne({
    where: { submissionId },
    order: [['id', 'DESC']],
  });
  const code = toRecord(document?.structuredData).submissionTypeCode;
  return typeof code === 'string' && code.trim() ? code.trim() : null;
}

/**
 * Stage keys an org has explicitly DISABLED in its default pipeline config. Maps
 * the org's disabled `operationKey`s (which equal board stage keys) so the route
 * resolver can drop them. Returns an empty set when the org has no config — the
 * unconfigured default is "run the whole route".
 */
export async function loadOrgDisabledStageKeys(organizationId: number | null): Promise<Set<string>> {
  const disabled = new Set<string>();
  if (!(organizationId && organizationId > 0)) return disabled;

  const config = await OrganizationPipelineConfig.findOne({
    where: { organizationId, isDefault: true, status: 'active' },
    order: [['id', 'DESC']],
  });
  if (!config) return disabled;

  const ops = await OrganizationPipelineConfigOperation.findAll({
    where: { organizationPipelineConfigId: config.id, enabled: false },
  });
  if (ops.length === 0) return disabled;

  const catalog = await PipelineOperationCatalog.findAll({
    where: { id: ops.map((o) => o.operationCatalogId) },
    attributes: ['id', 'operationKey'],
  });
  const keyById = new Map(catalog.map((c) => [c.id, c.operationKey]));
  for (const op of ops) {
    const key = keyById.get(op.operationCatalogId);
    if (key) disabled.add(key);
  }
  return disabled;
}

/**
 * Resolve the full ordered route a submission should follow: the type-specific
 * base route, with the org's disabled stages removed. Best-effort — any failure
 * degrades to the full default route so advancement never breaks on a routing
 * read.
 */
export async function resolveSubmissionRoute(submission: {
  id: number;
  organizationId?: number | null;
}): Promise<ResolvedRoute & { submissionTypeCode: string | null }> {
  try {
    const submissionTypeCode = await loadSubmissionTypeCode(submission.id);
    const base = routeForType(submissionTypeCode);
    const disabled = await loadOrgDisabledStageKeys(submission.organizationId ?? null);
    const keys = disabled.size > 0 ? applyEnabledOverride(base.keys, disabled) : base.keys;
    return { routeKey: base.routeKey, keys, submissionTypeCode };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `routing: resolveSubmissionRoute failed for submission ${submission.id}, using default route:`,
      err instanceof Error ? err.message : err,
    );
    const base = routeForType(null);
    return { routeKey: base.routeKey, keys: base.keys, submissionTypeCode: null };
  }
}
