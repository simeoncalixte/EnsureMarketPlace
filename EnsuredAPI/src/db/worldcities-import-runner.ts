/**
 * Core worldcities-import logic, shared by the CLI (`import-worldcities.ts`) and the admin
 * trigger route.
 *
 * Streaming, two-pass importer for SimpleMaps worldcities.csv (~1.94M rows / 321 MB). Populates
 * `stateProvinces` and `cities` and links them to the already-seeded `countries` (by iso3). The CSV
 * is far too large to hold in memory, so this never buffers the whole file:
 *
 *   Pass A  — stream once, collect the ~4.4k distinct states into a Map, insert the new ones, then
 *             SELECT them back to build a (countryId, code|name) -> stateId lookup.
 *   Pass B  — stream again, resolve countryId + stateProvinceId from the in-memory maps and flush
 *             cities to the DB in batches of CITY_BATCH; the row buffer is the only city data ever
 *             held in memory.
 *
 * Idempotent: states are only inserted when absent; cities use ignoreDuplicates on externalId.
 *
 * Run state is held at module scope so the API can start it as a fire-and-forget background task,
 * report progress, and request a cooperative stop — only one run at a time. The runner uses the
 * shared Sequelize connection and does NOT close it (the caller owns the connection lifecycle).
 */
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { QueryTypes } from 'sequelize';
import { getSequelize } from './config/database';

const CITY_BATCH = 5000;
const STATE_BATCH = 1000;

type CsvRow = Record<string, string>;

export type WorldcitiesImportOptions = { file?: string | null };

type RunState = {
  running: boolean;
  stopRequested: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  phase: 'idle' | 'pass_a' | 'states' | 'pass_b' | 'done';
  csvPath: string | null;
  scanned: number; // rows read in the current pass
  statesFound: number;
  statesInserted: number;
  citiesInserted: number;
  lastError: string | null;
};

const state: RunState = {
  running: false,
  stopRequested: false,
  startedAt: null,
  finishedAt: null,
  phase: 'idle',
  csvPath: null,
  scanned: 0,
  statesFound: 0,
  statesInserted: 0,
  citiesInserted: 0,
  lastError: null,
};

export function getWorldcitiesImportState(): RunState {
  return { ...state };
}

export function stopWorldcitiesImport(): boolean {
  if (!state.running) return false;
  state.stopRequested = true;
  return true;
}

export function resolveCsvPath(explicit?: string | null): string {
  const candidates = [
    explicit,
    process.env.WORLDCITIES_CSV,
    path.resolve(process.cwd(), 'worldcities.csv'),
    path.resolve(process.cwd(), '..', 'worldcities.csv'),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    `worldcities.csv not found. Pass file=/abs/path or set WORLDCITIES_CSV. Tried: ${candidates.join(', ')}`,
  );
}

function openRows(csvPath: string): AsyncIterable<CsvRow> {
  return fs
    .createReadStream(csvPath)
    .pipe(parse({ columns: true, skip_empty_lines: true, relax_quotes: true, trim: true }));
}

function num(value: string | undefined): number | null {
  if (value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function int(value: string | undefined): number | null {
  const n = num(value);
  return n === null ? null : Math.round(n);
}

function bool(value: string | undefined): boolean {
  return String(value).toUpperCase() === 'TRUE';
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

// A state is identified within its country by admin_code when present, else admin_name.
function stateKeyPart(adminCode: string, adminName: string): string | null {
  const part = (adminCode || adminName || '').trim();
  return part === '' ? null : part;
}

/**
 * Run the import to completion (or until stopped). Uses the shared Sequelize connection and does
 * NOT close it. Returns a summary of what was imported.
 */
export async function runWorldcitiesImport(
  opts: WorldcitiesImportOptions = {},
): Promise<{ statesInserted: number; citiesInserted: number; processed: number; stopped: boolean }> {
  const csvPath = resolveCsvPath(opts.file);
  state.csvPath = csvPath;
  console.log(`[worldcities] importing from ${csvPath}`);
  const sequelize = getSequelize();
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();

  // iso3 -> countryId
  const countryRows = await sequelize.query<{ id: number; iso3: string }>(
    'SELECT id, iso3 FROM countries',
    { type: QueryTypes.SELECT },
  );
  const countryIdByIso3 = new Map(countryRows.map((r) => [r.iso3, r.id]));
  console.log(`[worldcities] ${countryIdByIso3.size} countries loaded`);
  if (countryIdByIso3.size === 0) {
    throw new Error('No countries found. Run `npm run migrate` before importing.');
  }

  // ---- Pass A: collect distinct states ----
  type StateSeed = { countryId: number; keyPart: string; name: string; nameAscii: string | null; code: string | null; type: string | null };
  const stateByKey = new Map<string, StateSeed>(); // `${countryId}::${keyPart}`
  let scanned = 0;
  let skippedNoCountry = 0;
  state.phase = 'pass_a';
  state.scanned = 0;

  for await (const row of openRows(csvPath)) {
    if (state.stopRequested) return finish(scanned, true);
    scanned += 1;
    const countryId = countryIdByIso3.get(row.iso3);
    if (!countryId) {
      skippedNoCountry += 1;
      continue;
    }
    const keyPart = stateKeyPart(row.admin_code, row.admin_name);
    if (keyPart === null) continue; // city has no admin area -> no state row
    const key = `${countryId}::${keyPart}`;
    if (!stateByKey.has(key)) {
      stateByKey.set(key, {
        countryId,
        keyPart,
        name: row.admin_name || keyPart,
        nameAscii: row.admin_name_ascii || null,
        code: row.admin_code || null,
        type: row.admin_type || null,
      });
    }
    if (scanned % 250000 === 0) {
      state.scanned = scanned;
      state.statesFound = stateByKey.size;
      console.log(`[worldcities] pass A scanned ${scanned} rows, ${stateByKey.size} states so far`);
    }
  }
  state.scanned = scanned;
  state.statesFound = stateByKey.size;
  console.log(`[worldcities] pass A complete: ${scanned} rows, ${stateByKey.size} distinct states, ${skippedNoCountry} rows without a matching country`);

  // Insert only states not already present (idempotent across re-runs).
  state.phase = 'states';
  const existing = await sequelize.query<{ countryId: number; code: string | null; name: string }>(
    'SELECT "countryId", code, name FROM "stateProvinces"',
    { type: QueryTypes.SELECT },
  );
  const existingKeys = new Set(existing.map((s) => `${s.countryId}::${s.code ?? s.name}`));
  const now = new Date();
  const toInsert = [...stateByKey.values()]
    .filter((s) => !existingKeys.has(`${s.countryId}::${s.code ?? s.name}`))
    .map((s) => ({
      countryId: s.countryId,
      name: s.name,
      nameAscii: s.nameAscii,
      slug: slugify(s.name),
      code: s.code,
      type: s.type,
      latitude: null,
      longitude: null,
      population: null,
      createdAt: now,
      updatedAt: now,
    }));

  for (let i = 0; i < toInsert.length; i += STATE_BATCH) {
    await qi.bulkInsert('stateProvinces', toInsert.slice(i, i + STATE_BATCH), { ignoreDuplicates: true } as any);
  }
  state.statesInserted = toInsert.length;
  console.log(`[worldcities] inserted ${toInsert.length} new states (${existingKeys.size} already present)`);

  // Build (countryId, code|name) -> stateId lookup from the full table.
  const allStates = await sequelize.query<{ id: number; countryId: number; code: string | null; name: string }>(
    'SELECT id, "countryId", code, name FROM "stateProvinces"',
    { type: QueryTypes.SELECT },
  );
  const stateIdByKey = new Map<string, number>();
  for (const s of allStates) stateIdByKey.set(`${s.countryId}::${s.code ?? s.name}`, s.id);

  // ---- Pass B: stream cities in batches ----
  let buffer: Record<string, unknown>[] = [];
  let inserted = 0;
  let processed = 0;
  state.phase = 'pass_b';
  state.scanned = 0;
  state.citiesInserted = 0;

  const flush = async () => {
    if (buffer.length === 0) return;
    await qi.bulkInsert('cities', buffer, { ignoreDuplicates: true } as any);
    inserted += buffer.length;
    state.citiesInserted = inserted;
    buffer = [];
  };

  for await (const row of openRows(csvPath)) {
    if (state.stopRequested) {
      await flush();
      return finish(processed, true);
    }
    processed += 1;
    const countryId = countryIdByIso3.get(row.iso3);
    if (!countryId) continue;

    const keyPart = stateKeyPart(row.admin_code, row.admin_name);
    const stateProvinceId = keyPart !== null ? stateIdByKey.get(`${countryId}::${keyPart}`) ?? null : null;
    const alts = (row.city_alt || '').split('|').map((s) => s.trim()).filter(Boolean);

    buffer.push({
      externalId: row.id,
      countryId,
      stateProvinceId,
      name: row.city,
      nameAscii: row.city_ascii || null,
      altNames: alts.length ? JSON.stringify(alts) : null,
      latitude: num(row.lat),
      longitude: num(row.lng),
      capital: row.capital || null,
      isCapital: row.capital === 'primary',
      population: int(row.population),
      populationProper: int(row.population_proper),
      density: num(row.density),
      ranking: int(row.ranking),
      timezone: row.timezone || null,
      sameName: bool(row.same_name),
      createdAt: now,
      updatedAt: now,
    });

    if (buffer.length >= CITY_BATCH) {
      await flush();
      state.scanned = processed;
      if (inserted % 100000 === 0) {
        const mb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        console.log(`[worldcities] pass B: ${inserted} cities upserted (${processed} scanned, heap ${mb} MB)`);
      }
    }
  }
  await flush();
  state.scanned = processed;

  const cityCount = await sequelize.query<{ count: string }>('SELECT count(*)::text AS count FROM cities', {
    type: QueryTypes.SELECT,
  });
  console.log(`[worldcities] done. processed ${processed} rows; cities table now has ${cityCount[0].count} rows.`);
  return finish(processed, false);
}

function finish(processed: number, stopped: boolean) {
  state.phase = 'done';
  return {
    statesInserted: state.statesInserted,
    citiesInserted: state.citiesInserted,
    processed,
    stopped,
  };
}

/**
 * Start a run in the background (fire-and-forget). Returns immediately. Only one run at a time.
 */
export function startWorldcitiesImportInBackground(opts: WorldcitiesImportOptions = {}): {
  started: boolean;
  alreadyRunning: boolean;
} {
  if (state.running) return { started: false, alreadyRunning: true };
  state.running = true;
  state.stopRequested = false;
  state.startedAt = new Date().toISOString();
  state.finishedAt = null;
  state.phase = 'pass_a';
  state.csvPath = null;
  state.scanned = 0;
  state.statesFound = 0;
  state.statesInserted = 0;
  state.citiesInserted = 0;
  state.lastError = null;

  runWorldcitiesImport(opts)
    .catch((err) => {
      state.lastError = String((err as Error)?.message ?? err);
      console.error('[worldcities] background import failed:', err);
    })
    .finally(() => {
      state.running = false;
      state.stopRequested = false;
      state.finishedAt = new Date().toISOString();
    });

  return { started: true, alreadyRunning: false };
}
