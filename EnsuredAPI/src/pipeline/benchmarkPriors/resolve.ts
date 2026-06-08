import { Op } from 'sequelize';
import { BenchmarkPrior } from '../../db/models/benchmarkPrior.models';

/**
 * Slice 5.0 — Benchmark Prior resolver.
 *
 * Resolves the applicable benchmark prior for an (org, LOB, subtype) scope by the
 * SAME specificity ladder as the Risk Class Registry:
 *   org+subtype → org+primary → platform+subtype → platform+primary → none.
 *
 * Like the registry resolver, the pure selection (`selectPrior`) is split from the
 * DB query (`resolveBenchmarkPrior`) so the ladder is unit-testable without
 * Postgres. The resolver is total: on no match or any DB error it returns null
 * (a missing prior is a legitimate state — the compute path treats it as "no
 * prior" and the credibility blend handles it honestly).
 */

/** The plain shape the pure selector needs (not the Sequelize instance). */
export type BenchmarkPriorRow = {
  id: number;
  organizationId: number | null;
  lineOfBusinessCode: string;
  lineOfBusinessSubTypeCode: string;
  exposureBasis: string | null;
  lossRate: number | null;
  targetLossRatio: number | null;
  expenseRatio: number | null;
  marginTarget: number | null;
  fullCredibilityStandard: number | null;
  paramsJson: Record<string, unknown> | null;
  source: string;
  sourceUrl: string | null;
  asOfDate: string | null;
  status?: string | null;
};

export type BenchmarkPriorResolvedFrom =
  | 'org_subtype'
  | 'org_primary'
  | 'platform_subtype'
  | 'platform_primary'
  | 'none';

export type BenchmarkPriorResolution = {
  prior: BenchmarkPriorRow | null;
  resolvedFrom: BenchmarkPriorResolvedFrom;
};

function normalizeString(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * PURE specificity-ladder selection over candidate prior rows. Mirrors the
 * registry's `selectResolution`. Never throws; returns `{ prior: null,
 * resolvedFrom: 'none' }` when nothing matches.
 */
export function selectPrior(
  rows: BenchmarkPriorRow[],
  tenantId: number | null,
  lineOfBusinessCode: string | null,
  lineOfBusinessSubTypeCode?: string | null,
): BenchmarkPriorResolution {
  const primary = normalizeString(lineOfBusinessCode);
  const subType = normalizeString(lineOfBusinessSubTypeCode);

  const activeRows = (Array.isArray(rows) ? rows : []).filter(
    (row) => row && (row.status == null || row.status === 'active'),
  );

  const isOrg = (row: BenchmarkPriorRow): boolean => tenantId != null && row.organizationId === tenantId;
  const isPlatform = (row: BenchmarkPriorRow): boolean => row.organizationId == null;
  const matchesPrimary = (row: BenchmarkPriorRow): boolean => normalizeString(row.lineOfBusinessCode) === primary;
  const matchesSubType = (row: BenchmarkPriorRow): boolean =>
    normalizeString(row.lineOfBusinessSubTypeCode) === subType;
  const hasNoSubType = (row: BenchmarkPriorRow): boolean =>
    normalizeString(row.lineOfBusinessSubTypeCode) === '';

  if (subType) {
    const hit = activeRows.find((row) => isOrg(row) && matchesPrimary(row) && matchesSubType(row));
    if (hit) {
      return { prior: hit, resolvedFrom: 'org_subtype' };
    }
  }

  if (primary) {
    const hit = activeRows.find((row) => isOrg(row) && matchesPrimary(row) && hasNoSubType(row));
    if (hit) {
      return { prior: hit, resolvedFrom: 'org_primary' };
    }
  }

  if (subType) {
    const hit = activeRows.find((row) => isPlatform(row) && matchesPrimary(row) && matchesSubType(row));
    if (hit) {
      return { prior: hit, resolvedFrom: 'platform_subtype' };
    }
  }

  if (primary) {
    const hit = activeRows.find((row) => isPlatform(row) && matchesPrimary(row) && hasNoSubType(row));
    if (hit) {
      return { prior: hit, resolvedFrom: 'platform_primary' };
    }
  }

  return { prior: null, resolvedFrom: 'none' };
}

function toNumberOrNull(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Map a Sequelize instance to the pure row shape (DECIMAL columns arrive as strings). */
function toRow(instance: BenchmarkPrior): BenchmarkPriorRow {
  return {
    id: instance.id,
    organizationId: instance.organizationId,
    lineOfBusinessCode: instance.lineOfBusinessCode,
    lineOfBusinessSubTypeCode: instance.lineOfBusinessSubTypeCode,
    exposureBasis: instance.exposureBasis ?? null,
    lossRate: toNumberOrNull(instance.lossRate),
    targetLossRatio: toNumberOrNull(instance.targetLossRatio),
    expenseRatio: toNumberOrNull(instance.expenseRatio),
    marginTarget: toNumberOrNull(instance.marginTarget),
    fullCredibilityStandard: toNumberOrNull(instance.fullCredibilityStandard),
    paramsJson: instance.paramsJson ?? {},
    source: instance.source,
    sourceUrl: instance.sourceUrl ?? null,
    asOfDate: instance.asOfDate ?? null,
    status: instance.status,
  };
}

/**
 * Load candidate prior rows for the scope: this org's rows + platform rows for
 * this primary code. Thin and DB-only — the pure selector picks the winner.
 */
async function loadCandidateRows(
  tenantId: number | null,
  lineOfBusinessCode: string,
): Promise<BenchmarkPriorRow[]> {
  const organizationIdClause =
    tenantId != null ? { [Op.or]: [{ [Op.eq]: tenantId }, { [Op.is]: null }] } : { [Op.is]: null };

  const rows = await BenchmarkPrior.findAll({
    where: {
      organizationId: organizationIdClause,
      lineOfBusinessCode,
      status: 'active',
    },
  });

  return rows.map(toRow);
}

/**
 * Resolve the applicable benchmark prior. Total: returns `{ prior: null }` when no
 * row matches and degrades to null on any DB error rather than throwing — a
 * missing prior must never break the compute path.
 */
export async function resolveBenchmarkPrior(
  tenantId: number | null,
  lineOfBusinessCode: string | null,
  lineOfBusinessSubTypeCode?: string | null,
): Promise<BenchmarkPriorResolution> {
  const primary = normalizeString(lineOfBusinessCode);
  const subType = normalizeString(lineOfBusinessSubTypeCode);

  if (!primary) {
    return { prior: null, resolvedFrom: 'none' };
  }

  try {
    const rows = await loadCandidateRows(tenantId, primary);
    return selectPrior(rows, tenantId, primary, subType);
  } catch {
    return { prior: null, resolvedFrom: 'none' };
  }
}
