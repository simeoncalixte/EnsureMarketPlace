import { BenchmarkPrior } from '../../db/models/benchmarkPrior.models';

/**
 * Benchmark prior upsert (Slice 5.0).
 *
 * A benchmark prior is DATA, not code. `PUT .../benchmark-priors/:lob` upserts the
 * row for an (org, primary, subtype) scope: update in place when one exists,
 * otherwise create. The decision is split into a pure, unit-testable function so it
 * does not need Postgres. Mirrors `src/pipeline/registry/upsert.ts`.
 *
 * `source` (the citation) is REQUIRED on create — there is no undefended number in
 * this table.
 */

export type PriorDeclaration = {
  exposureBasis?: string | null;
  lossRate?: number | string | null;
  targetLossRatio?: number | string | null;
  expenseRatio?: number | string | null;
  marginTarget?: number | string | null;
  fullCredibilityStandard?: number | string | null;
  paramsJson?: Record<string, unknown>;
  source?: string;
  sourceUrl?: string | null;
  asOfDate?: string | null;
  status?: 'active' | 'inactive';
  createdByUserId?: number | null;
};

export type UpsertPriorParams = {
  organizationId: number | null;
  lineOfBusinessCode: string;
  lineOfBusinessSubTypeCode: string;
} & PriorDeclaration;

export type UpsertPriorDecision = { action: 'update'; updateId: number } | { action: 'create' };

/**
 * Pure decision: given existing rows for the same (org, primary, subtype) scope,
 * decide update vs create. First exact-scope match wins; otherwise create.
 */
export function decidePriorUpsert(
  existingRows: Array<{
    id: number;
    organizationId: number | null;
    lineOfBusinessCode: string;
    lineOfBusinessSubTypeCode: string;
  }>,
  organizationId: number | null,
  lineOfBusinessCode: string,
  lineOfBusinessSubTypeCode: string,
): UpsertPriorDecision {
  const match = (Array.isArray(existingRows) ? existingRows : []).find(
    (row) =>
      row.organizationId === organizationId &&
      row.lineOfBusinessCode === lineOfBusinessCode &&
      row.lineOfBusinessSubTypeCode === lineOfBusinessSubTypeCode,
  );

  if (match) {
    return { action: 'update', updateId: match.id };
  }
  return { action: 'create' };
}

function toDecimalStringOrNull(value: number | string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Build the set of column values to write, applying only provided fields. */
function buildWriteValues(params: UpsertPriorParams): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  if (params.exposureBasis !== undefined) values.exposureBasis = params.exposureBasis ?? null;
  if (params.lossRate !== undefined) values.lossRate = toDecimalStringOrNull(params.lossRate);
  if (params.targetLossRatio !== undefined) values.targetLossRatio = toDecimalStringOrNull(params.targetLossRatio);
  if (params.expenseRatio !== undefined) values.expenseRatio = toDecimalStringOrNull(params.expenseRatio);
  if (params.marginTarget !== undefined) values.marginTarget = toDecimalStringOrNull(params.marginTarget);
  if (params.fullCredibilityStandard !== undefined)
    values.fullCredibilityStandard = toDecimalStringOrNull(params.fullCredibilityStandard);
  if (params.paramsJson !== undefined) values.paramsJson = params.paramsJson ?? {};
  if (params.source !== undefined && params.source) values.source = params.source;
  if (params.sourceUrl !== undefined) values.sourceUrl = params.sourceUrl ?? null;
  if (params.asOfDate !== undefined) values.asOfDate = params.asOfDate ?? null;
  if (params.status !== undefined) values.status = params.status ?? 'active';
  return values;
}

/**
 * DB-backed upsert of a benchmark prior for an (org, primary, subtype) scope.
 * Returns the persisted row. The unique index guarantees one row per scope. On
 * create, `source` is required (throws a clear error if missing) — the citation
 * contract is enforced at the write boundary.
 */
export async function upsertBenchmarkPrior(params: UpsertPriorParams): Promise<BenchmarkPrior> {
  const organizationId = params.organizationId ?? null;
  const lineOfBusinessCode = params.lineOfBusinessCode;
  const lineOfBusinessSubTypeCode = params.lineOfBusinessSubTypeCode ?? '';

  const existing = await BenchmarkPrior.findOne({
    where: { organizationId, lineOfBusinessCode, lineOfBusinessSubTypeCode },
  });

  const writeValues = buildWriteValues(params);

  if (existing) {
    return existing.update(writeValues);
  }

  const source = (params.source ?? '').trim();
  if (!source) {
    throw new Error('source citation is required to create a benchmark prior');
  }

  return BenchmarkPrior.create({
    organizationId,
    lineOfBusinessCode,
    lineOfBusinessSubTypeCode,
    exposureBasis: params.exposureBasis ?? null,
    lossRate: toDecimalStringOrNull(params.lossRate),
    targetLossRatio: toDecimalStringOrNull(params.targetLossRatio),
    expenseRatio: toDecimalStringOrNull(params.expenseRatio),
    marginTarget: toDecimalStringOrNull(params.marginTarget),
    fullCredibilityStandard: toDecimalStringOrNull(params.fullCredibilityStandard),
    paramsJson: params.paramsJson ?? {},
    source,
    sourceUrl: params.sourceUrl ?? null,
    asOfDate: params.asOfDate ?? null,
    status: params.status ?? 'active',
    createdByUserId: params.createdByUserId ?? null,
  });
}
