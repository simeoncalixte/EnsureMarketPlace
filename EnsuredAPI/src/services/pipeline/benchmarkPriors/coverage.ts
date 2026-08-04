import { selectPrior, type BenchmarkPriorRow } from './resolve';

/**
 * Slice 5.3 — benchmark-prior COVERAGE report (PURE, DB-free core).
 *
 * For each PRIMARY taxonomy line, report whether a PLATFORM-DEFAULT benchmark prior
 * exists (so we can see which lines are cited vs. fall back to the generic
 * catch-all). Read-only and additive — it does not change resolution behavior.
 *
 * A line is "covered" when the specificity ladder resolves to a PLATFORM prior for
 * that primary code (platform_primary or platform_subtype) — i.e. NOT 'none' and not
 * only via the generic catch-all. Coverage is computed against platform rows only
 * (organizationId = null); org overrides are out of scope for the platform coverage
 * picture.
 */

export type CoverageLine = {
  code: string;
  label: string;
  hasPlatformPrior: boolean;
  /** How the prior resolved for this line: 'platform_primary' | 'platform_subtype' | 'none'. */
  resolvedFrom: 'platform_primary' | 'platform_subtype' | 'none';
  /** The citation of the resolved platform prior, or null when uncovered. */
  source: string | null;
};

export type TaxonomyLine = { code: string; label: string };

/**
 * PURE coverage computation. Given the taxonomy primary lines and the set of
 * PLATFORM benchmark prior rows (organizationId === null), return one coverage
 * entry per line. Reuses the existing `selectPrior` ladder with organizationId = null so
 * the coverage definition is exactly the platform-resolution definition.
 */
export function computeCoverage(
  taxonomyLines: TaxonomyLine[],
  platformPriorRows: BenchmarkPriorRow[],
): CoverageLine[] {
  const platformRows = (Array.isArray(platformPriorRows) ? platformPriorRows : []).filter(
    (row) => row && row.organizationId == null,
  );

  return (Array.isArray(taxonomyLines) ? taxonomyLines : []).map((line) => {
    // Resolve at the PRIMARY level (no subtype) against platform rows only.
    const resolution = selectPrior(platformRows, null, line.code, null);
    const resolvedFrom = resolution.resolvedFrom;

    const covered = resolvedFrom === 'platform_primary' || resolvedFrom === 'platform_subtype';

    return {
      code: line.code,
      label: line.label,
      hasPlatformPrior: covered,
      resolvedFrom: covered ? resolvedFrom : 'none',
      source: covered ? resolution.prior?.source ?? null : null,
    };
  });
}

/** Summary counts over a coverage list — handy for the route response + tests. */
export function summarizeCoverage(lines: CoverageLine[]): {
  total: number;
  covered: number;
  uncovered: number;
} {
  const total = lines.length;
  const covered = lines.filter((l) => l.hasPlatformPrior).length;
  return { total, covered, uncovered: total - covered };
}
