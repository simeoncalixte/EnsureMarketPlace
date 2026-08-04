/**
 * Slice 5.3 — Benchmark-prior importer.
 *
 * Reads a CITED CSV or JSON file of benchmark priors and idempotently upserts each
 * row via the EXISTING `upsertBenchmarkPrior` path (which enforces the source
 * citation on create and the unique (org, lob, subtype) scope). Mirrors the
 * structure of import-worldcities.ts / import-cresta-zones.ts (CLI runner +
 * resolvable file path + idempotent upsert), but the priors set is tiny so it does
 * not stream.
 *
 * The PARSE + VALIDATE step is a pure, unit-tested function (`parsePriorRows`) so it
 * needs no Postgres. EVERY row MUST carry a non-empty `source` citation — uncited
 * rows are REJECTED (collected into `errors`, never written).
 *
 * Usage:
 *   npm run import:benchmark-priors                                   # default sample file
 *   npm run import:benchmark-priors -- --file=/abs/path/priors.csv
 *   npm run import:benchmark-priors -- --file=/abs/path/priors.json
 *   BENCHMARK_PRIORS_FILE=/abs/path/priors.json npm run import:benchmark-priors
 *
 * The ILF curve for a casualty line is supplied in the `ilf` column as a JSON string
 * (CSV) or a nested object (JSON); it is stored into paramsJson.ilf. Any other
 * paramsJson content can be passed via a `paramsJson` JSON column.
 */
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { getSequelize, closeSequelize } from './config/database';
import { upsertBenchmarkPrior } from '../services/pipeline/benchmarkPriors/upsert';

export type ParsedPriorRow = {
  organizationId: number | null;
  lineOfBusinessCode: string;
  lineOfBusinessSubTypeCode: string;
  exposureBasis: string | null;
  lossRate: string | null;
  targetLossRatio: string | null;
  expenseRatio: string | null;
  marginTarget: string | null;
  fullCredibilityStandard: string | null;
  paramsJson: Record<string, unknown>;
  source: string;
  sourceUrl: string | null;
  asOfDate: string | null;
  status: 'active' | 'inactive';
};

export type ParsePriorsResult = {
  rows: ParsedPriorRow[];
  errors: Array<{ index: number; lineOfBusinessCode: string | null; reason: string }>;
};

function strOrNull(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

function intOrNull(value: unknown): number | null {
  const s = strOrNull(value);
  if (s == null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** Parse a JSON-ish cell that may be an object (JSON input) or a string (CSV input). */
function parseJsonCell(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === 'object') return value as Record<string, unknown>;
  const s = String(value).trim();
  if (s === '') return null;
  try {
    const parsed = JSON.parse(s);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * PURE parse + validate. Given an array of raw records (already CSV- or
 * JSON-decoded), produce the upsert-ready rows and a list of rejected rows.
 *
 * Validation rules:
 *  - `lineOfBusinessCode` is REQUIRED (non-empty) — else rejected.
 *  - `source` (citation) is REQUIRED (non-empty) — else rejected (no undefended row).
 *  - `ilf` (string or object) is folded into paramsJson.ilf when present and parseable;
 *    an unparseable ilf cell is a rejection (we do not silently drop a curve).
 *  - all numeric/ratio columns are kept as trimmed strings (DECIMAL columns) or null.
 */
export function parsePriorRows(records: Array<Record<string, unknown>>): ParsePriorsResult {
  const rows: ParsedPriorRow[] = [];
  const errors: ParsePriorsResult['errors'] = [];

  records.forEach((rec, index) => {
    const lob = strOrNull(rec.lineOfBusinessCode);
    if (!lob) {
      errors.push({ index, lineOfBusinessCode: null, reason: 'missing lineOfBusinessCode' });
      return;
    }

    const source = strOrNull(rec.source);
    if (!source) {
      errors.push({ index, lineOfBusinessCode: lob, reason: 'missing source citation (uncited rows are rejected)' });
      return;
    }

    // Build paramsJson: a base paramsJson cell (optional) plus an ilf cell (optional).
    const baseParams = parseJsonCell(rec.paramsJson) ?? {};
    const paramsJson: Record<string, unknown> = { ...baseParams };
    if (rec.ilf != null && String(rec.ilf).trim() !== '') {
      const ilf = parseJsonCell(rec.ilf);
      if (ilf == null) {
        errors.push({ index, lineOfBusinessCode: lob, reason: 'ilf cell present but not valid JSON' });
        return;
      }
      paramsJson.ilf = ilf;
    }

    const statusRaw = strOrNull(rec.status);
    const status: 'active' | 'inactive' = statusRaw === 'inactive' ? 'inactive' : 'active';

    rows.push({
      organizationId: intOrNull(rec.organizationId),
      lineOfBusinessCode: lob,
      lineOfBusinessSubTypeCode: strOrNull(rec.lineOfBusinessSubTypeCode) ?? '',
      exposureBasis: strOrNull(rec.exposureBasis),
      lossRate: strOrNull(rec.lossRate),
      targetLossRatio: strOrNull(rec.targetLossRatio),
      expenseRatio: strOrNull(rec.expenseRatio),
      marginTarget: strOrNull(rec.marginTarget),
      fullCredibilityStandard: strOrNull(rec.fullCredibilityStandard),
      paramsJson,
      source,
      sourceUrl: strOrNull(rec.sourceUrl),
      asOfDate: strOrNull(rec.asOfDate),
      status,
    });
  });

  return { rows, errors };
}

/** Decode a file (by extension) into raw records, ready for `parsePriorRows`. */
export function decodeFile(filePath: string): Array<Record<string, unknown>> {
  const raw = fs.readFileSync(filePath, 'utf8');
  if (filePath.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Array<Record<string, unknown>>;
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).priors)) {
      return (parsed as any).priors;
    }
    throw new Error('JSON file must be an array of priors or { priors: [...] }');
  }
  // CSV (default).
  return parse(raw, { columns: true, skip_empty_lines: true, trim: true, relax_quotes: true });
}

function resolveFilePath(): string {
  const arg = process.argv.find((a) => a.startsWith('--file='));
  const candidates = [
    arg ? arg.slice('--file='.length) : undefined,
    process.env.BENCHMARK_PRIORS_FILE,
    path.resolve(__dirname, 'seed-data', 'benchmarkPriors.sample.csv'),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    `benchmark priors file not found. Pass --file=/abs/path or set BENCHMARK_PRIORS_FILE. Tried: ${candidates.join(', ')}`,
  );
}

async function run(): Promise<void> {
  const filePath = resolveFilePath();
  console.log(`[benchmark-priors] importing from ${filePath}`);

  const records = decodeFile(filePath);
  const { rows, errors } = parsePriorRows(records);

  if (errors.length > 0) {
    console.warn(`[benchmark-priors] ${errors.length} row(s) REJECTED (not written):`);
    for (const e of errors) {
      console.warn(`  - row ${e.index} (${e.lineOfBusinessCode ?? '?'}): ${e.reason}`);
    }
  }

  const sequelize = getSequelize();
  await sequelize.authenticate();

  let upserted = 0;
  for (const row of rows) {
    await upsertBenchmarkPrior({
      organizationId: row.organizationId,
      lineOfBusinessCode: row.lineOfBusinessCode,
      lineOfBusinessSubTypeCode: row.lineOfBusinessSubTypeCode,
      exposureBasis: row.exposureBasis,
      lossRate: row.lossRate,
      targetLossRatio: row.targetLossRatio,
      expenseRatio: row.expenseRatio,
      marginTarget: row.marginTarget,
      fullCredibilityStandard: row.fullCredibilityStandard,
      paramsJson: row.paramsJson,
      source: row.source,
      sourceUrl: row.sourceUrl,
      asOfDate: row.asOfDate,
      status: row.status,
    });
    upserted += 1;
  }

  console.log(
    `[benchmark-priors] done. upserted ${upserted} prior(s); rejected ${errors.length} uncited/invalid row(s).`,
  );
}

// Only run as a CLI when invoked directly (so the pure exports can be unit-tested
// without triggering a DB connection).
if (require.main === module) {
  run()
    .catch((error) => {
      console.error('[benchmark-priors] import failed.', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await closeSequelize();
    });
}
