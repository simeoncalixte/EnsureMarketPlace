import { computeCoverage, summarizeCoverage, type TaxonomyLine } from './coverage';
import type { BenchmarkPriorRow } from './resolve';

/**
 * Slice 5.3 — coverage-report pure function tests (DB-free).
 */

const TAXONOMY: TaxonomyLine[] = [
  { code: 'commercial_property', label: 'Commercial Property' },
  { code: 'professional_liability', label: 'Professional Liability' },
  { code: 'farm_ranch', label: 'Farm & Ranch' }, // intentionally uncovered
];

function platformPrior(lob: string, source: string, subType = ''): BenchmarkPriorRow {
  return {
    id: Math.floor(Math.random() * 1e6),
    organizationId: null,
    lineOfBusinessCode: lob,
    lineOfBusinessSubTypeCode: subType,
    exposureBasis: null,
    lossRate: null,
    targetLossRatio: 0.7,
    expenseRatio: null,
    marginTarget: null,
    fullCredibilityStandard: null,
    paramsJson: {},
    source,
    sourceUrl: null,
    asOfDate: null,
    status: 'active',
  };
}

describe('computeCoverage', () => {
  it('marks lines with a platform primary prior as covered, others as none', () => {
    const rows = [
      platformPrior('commercial_property', 'NAIC commercial property'),
      platformPrior('professional_liability', 'NAIC professional liability'),
    ];
    const lines = computeCoverage(TAXONOMY, rows);

    const cp = lines.find((l) => l.code === 'commercial_property')!;
    expect(cp.hasPlatformPrior).toBe(true);
    expect(cp.resolvedFrom).toBe('platform_primary');
    expect(cp.source).toMatch(/NAIC/);

    const farm = lines.find((l) => l.code === 'farm_ranch')!;
    expect(farm.hasPlatformPrior).toBe(false);
    expect(farm.resolvedFrom).toBe('none');
    expect(farm.source).toBeNull();
  });

  it('ignores org-scoped rows (coverage is platform-only)', () => {
    const orgRow: BenchmarkPriorRow = { ...platformPrior('farm_ranch', 'org override'), organizationId: 42 };
    const lines = computeCoverage(TAXONOMY, [orgRow]);
    expect(lines.find((l) => l.code === 'farm_ranch')!.hasPlatformPrior).toBe(false);
  });

  it('summarizeCoverage counts covered/uncovered', () => {
    const rows = [platformPrior('commercial_property', 'cite')];
    const lines = computeCoverage(TAXONOMY, rows);
    const summary = summarizeCoverage(lines);
    expect(summary.total).toBe(3);
    expect(summary.covered).toBe(1);
    expect(summary.uncovered).toBe(2);
  });
});
