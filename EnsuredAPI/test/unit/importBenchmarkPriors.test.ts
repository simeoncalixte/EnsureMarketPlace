import path from 'path';
import { parsePriorRows, decodeFile } from '../../src/db/import-benchmark-priors';
import { decidePriorUpsert } from '../../src/pipeline/benchmarkPriors/upsert';

/**
 * Slice 5.3 — benchmark-prior importer parse + idempotency + uncited-rejection.
 * Pure (DB-free): exercises the pure parse/decode exports and the reused upsert
 * decision; no upsertBenchmarkPrior call, no Postgres connection.
 */

describe('parsePriorRows', () => {
  it('parses a cited row and folds an ilf JSON string into paramsJson.ilf', () => {
    const { rows, errors } = parsePriorRows([
      {
        lineOfBusinessCode: 'professional_liability',
        exposureBasis: 'revenue',
        targetLossRatio: '0.700000',
        ilf: '{"basisLimit":1000000,"points":[{"limit":1000000,"factor":1.0}]}',
        source: 'NAIC professional liability loss ratios ~65-75%',
        sourceUrl: 'https://content.naic.org/research-actuarial',
        asOfDate: '2024-12-31',
      },
    ]);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0].lineOfBusinessSubTypeCode).toBe('');
    expect((rows[0].paramsJson.ilf as any).basisLimit).toBe(1_000_000);
    expect(rows[0].targetLossRatio).toBe('0.700000');
    expect(rows[0].status).toBe('active');
  });

  it('REJECTS an uncited row (missing source)', () => {
    const { rows, errors } = parsePriorRows([{ lineOfBusinessCode: 'cyber', targetLossRatio: '0.65' }]);
    expect(rows).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].reason).toMatch(/source/i);
  });

  it('REJECTS a row with no lineOfBusinessCode', () => {
    const { rows, errors } = parsePriorRows([{ source: 'cited but no lob' }]);
    expect(rows).toHaveLength(0);
    expect(errors[0].reason).toMatch(/lineOfBusinessCode/);
  });

  it('REJECTS a row whose ilf cell is not valid JSON (curve not silently dropped)', () => {
    const { rows, errors } = parsePriorRows([{ lineOfBusinessCode: 'cyber', source: 'cited', ilf: 'not-json{' }]);
    expect(rows).toHaveLength(0);
    expect(errors[0].reason).toMatch(/ilf/);
  });

  it('accepts a nested ilf OBJECT (JSON-file input path)', () => {
    const { rows, errors } = parsePriorRows([
      {
        lineOfBusinessCode: 'directors_officers',
        source: 'cited',
        ilf: { basisLimit: 1_000_000, points: [{ limit: 1_000_000, factor: 1 }] },
      },
    ]);
    expect(errors).toHaveLength(0);
    expect((rows[0].paramsJson.ilf as any).basisLimit).toBe(1_000_000);
  });
});

describe('idempotent upsert decision (reused decidePriorUpsert)', () => {
  it('first import → create; re-import of same scope → update (no duplicate)', () => {
    const existing: Array<{
      id: number;
      organizationId: number | null;
      lineOfBusinessCode: string;
      lineOfBusinessSubTypeCode: string;
    }> = [];
    expect(decidePriorUpsert(existing, null, 'cyber', '')).toEqual({ action: 'create' });
    existing.push({ id: 7, organizationId: null, lineOfBusinessCode: 'cyber', lineOfBusinessSubTypeCode: '' });
    expect(decidePriorUpsert(existing, null, 'cyber', '')).toEqual({ action: 'update', updateId: 7 });
  });
});

describe('decodeFile (sample CSV ships with the tranche)', () => {
  it('decodes the shipped sample CSV and every row parses cited', () => {
    const file = path.resolve(__dirname, '..', '..', 'src', 'db', 'seed-data', 'benchmarkPriors.sample.csv');
    const records = decodeFile(file);
    expect(records.length).toBeGreaterThanOrEqual(5);
    const { rows, errors } = parsePriorRows(records as Array<Record<string, unknown>>);
    expect(errors).toHaveLength(0);
    expect(rows.length).toBe(records.length);
    const prof = rows.find((r) => r.lineOfBusinessCode === 'professional_liability');
    expect((prof!.paramsJson.ilf as any).basisLimit).toBe(1_000_000);
  });
});
