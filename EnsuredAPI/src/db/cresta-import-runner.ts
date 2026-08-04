/**
 * Core CRESTA-zone import logic, shared by the CLI (`import-cresta-zones.ts`) and the admin
 * trigger route.
 *
 * Concurrency model: up to CONCURRENCY (3) countries are processed in parallel by a worker pool.
 * Each worker handles one (country, level) target at a time and throttles ITS OWN pagination to
 * one request per PAGE_THROTTLE_MS (10s) — so the aggregate peak is ~3 requests / 10s, while any
 * single country still only hits the API every 10s. Each page is checkpointed into
 * `crestaImportProgress` immediately, so the whole job is fully resumable.
 *
 * Run state is held at module scope so the API can start it as a fire-and-forget background task,
 * report progress, and request a cooperative stop — only one run at a time.
 */
import { QueryTypes } from 'sequelize';
import { getSequelize } from './config/database';
import { CrestaImportProgress, CrestaLevel, CrestaZone } from './models/cresta.models';

const CONCURRENCY = 3; // max countries processed in parallel
const PAGE_THROTTLE_MS = 10_000; // per-worker (per-country) gap between page requests
const RELEASE = 2019;
const FETCH_TIMEOUT_MS = 60_000;
const ENDPOINT: Record<CrestaLevel, string> = {
  state_province: 'lowreszones',
  city: 'highreszones',
};

export type CrestaImportOptions = { only?: string[] | null; level?: CrestaLevel | null; pageSize?: number };

type ApiItem = {
  id: number | string;
  crestaId: string;
  description?: string | null;
  extent?: { sw?: { lat: number; lng: number }; ne?: { lat: number; lng: number } } | null;
};
type ApiResponse = { items: ApiItem[]; totalElements: number };

type RunState = {
  running: boolean;
  stopRequested: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  concurrency: number;
  active: string[];
  current: string | null;
  lastError: string | null;
  options: CrestaImportOptions | null;
};

const state: RunState = {
  running: false,
  stopRequested: false,
  startedAt: null,
  finishedAt: null,
  concurrency: CONCURRENCY,
  active: [],
  current: null,
  lastError: null,
  options: null,
};

export function getCrestaImportState(): RunState {
  return { ...state, active: [...state.active] };
}

export function stopCrestaImport(): boolean {
  if (!state.running) return false;
  state.stopRequested = true;
  return true;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(iso3: string, level: CrestaLevel, pageSize: number, offset: number): Promise<ApiResponse> {
  const url = `https://cresta.org/api/countries/${iso3}/${RELEASE}/${ENDPOINT[level]}/info?pageSize=${pageSize}&offset=${offset}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
    if (!res.ok) {
      const err = new Error(res.status === 404 ? 'not_found' : `http_${res.status}`) as Error & { httpStatus?: number };
      err.httpStatus = res.status;
      throw err;
    }
    return (await res.json()) as ApiResponse;
  } finally {
    clearTimeout(timer);
  }
}

function midpoint(extent: ApiItem['extent']): { lat: number | null; lng: number | null } {
  if (!extent?.sw || !extent?.ne) return { lat: null, lng: null };
  return {
    lat: (Number(extent.sw.lat) + Number(extent.ne.lat)) / 2,
    lng: (Number(extent.sw.lng) + Number(extent.ne.lng)) / 2,
  };
}

function refreshCurrent(): void {
  state.current = state.active.length ? state.active.join(', ') : null;
}

// Paginate a single (country, level) target to completion (or until stopped), throttled to one
// request per PAGE_THROTTLE_MS via the worker-local `throttle`.
async function processTarget(
  progress: CrestaImportProgress,
  countryIdByIso3: Map<string, number>,
  throttle: () => Promise<void>,
  setActive: (label: string | null) => void,
): Promise<void> {
  const { countryIso3 } = progress;
  const lvl = progress.level;
  const pageSize = progress.pageSize ?? 1000;
  if (!progress.startedAt) progress.startedAt = new Date();

  try {
    for (;;) {
      if (state.stopRequested) break;
      await throttle();
      if (state.stopRequested) break;
      const offset = progress.nextOffset;
      setActive(`${countryIso3} ${lvl} @${offset}`);

      let page: ApiResponse;
      try {
        page = await fetchPage(countryIso3, lvl, pageSize, offset);
      } catch (err) {
        const httpStatus = (err as { httpStatus?: number }).httpStatus;
        if (httpStatus === 404) {
          progress.status = 'unavailable';
          progress.lastError = 'API returned 404 (no data for this country/level)';
        } else {
          progress.status = 'in_progress';
          progress.attempts += 1;
          progress.lastError = String((err as Error).message ?? err);
        }
        await progress.save();
        break;
      }

      if (progress.totalElements == null) progress.totalElements = page.totalElements ?? 0;
      const items = Array.isArray(page.items) ? page.items : [];

      if (items.length > 0) {
        const rows = items.map((it) => {
          const c = midpoint(it.extent);
          return {
            crestaId: it.crestaId,
            externalId: String(it.id),
            countryId: countryIdByIso3.get(countryIso3) ?? null,
            countryIso3,
            level: lvl,
            name: it.description ?? null,
            bbox: it.extent ?? null,
            latitude: c.lat,
            longitude: c.lng,
            geometry: null,
            release: RELEASE,
          };
        });
        await CrestaZone.bulkCreate(rows as any, { ignoreDuplicates: true });
      }

      progress.nextOffset = offset + items.length;
      progress.imported += items.length;
      progress.status = 'in_progress';
      progress.lastFetchedAt = new Date();
      progress.lastError = null;

      const done =
        items.length < pageSize ||
        (progress.totalElements != null && progress.nextOffset >= progress.totalElements) ||
        items.length === 0;
      if (done) {
        progress.status = 'complete';
        progress.completedAt = new Date();
      }
      await progress.save();
      console.log(`[cresta] ${countryIso3} ${lvl}: ${progress.nextOffset}/${progress.totalElements ?? '?'}${done ? ' ✓' : ''}`);
      if (done) break;
    }
  } catch (err) {
    progress.status = 'in_progress';
    progress.attempts += 1;
    progress.lastError = String((err as Error).message ?? err);
    await progress.save();
    console.error(`[cresta] ${countryIso3} ${lvl}: unexpected error`, err);
  } finally {
    setActive(null);
  }
}

/**
 * Run the import to completion (or until stopped) using a pool of CONCURRENCY workers. Uses the
 * shared Sequelize connection and does NOT close it (the caller owns the connection lifecycle).
 */
export async function runCrestaImport(opts: CrestaImportOptions = {}): Promise<{ processed: number }> {
  const only = opts.only?.map((s) => s.trim().toUpperCase()).filter(Boolean) ?? null;
  const level = opts.level ?? null;
  const pageSizeOverride = opts.pageSize;

  const sequelize = getSequelize();
  await sequelize.authenticate();

  const countryRows = await sequelize.query<{ id: number; iso3: string }>('SELECT id, iso3 FROM countries', {
    type: QueryTypes.SELECT,
  });
  const countryIdByIso3 = new Map(countryRows.map((r) => [r.iso3, r.id]));

  const todo = await CrestaImportProgress.findAll({ order: [['level', 'ASC'], ['countryIso3', 'ASC']] });
  const queue = todo.filter((p) => {
    if (p.status === 'complete' || p.status === 'unavailable') return false;
    if (only && !only.includes(p.countryIso3.toUpperCase())) return false;
    if (level && p.level !== level) return false;
    if (pageSizeOverride) p.pageSize = pageSizeOverride;
    return true;
  });
  console.log(
    `[cresta] ${queue.length} (country, level) targets; ${CONCURRENCY} in parallel, 1 request / ${PAGE_THROTTLE_MS / 1000}s per country`,
  );

  let processed = 0;
  const workerCount = Math.min(CONCURRENCY, queue.length);
  state.active = new Array(workerCount).fill(null) as unknown as string[];

  const worker = async (slot: number): Promise<void> => {
    let workerLast = 0;
    const throttle = async () => {
      const wait = PAGE_THROTTLE_MS - (Date.now() - workerLast);
      if (wait > 0) await sleep(wait);
      workerLast = Date.now();
    };
    const setActive = (label: string | null) => {
      state.active[slot] = label as string;
      refreshCurrent();
    };
    for (;;) {
      if (state.stopRequested) return;
      const next = queue.shift();
      if (!next) return;
      await processTarget(next, countryIdByIso3, throttle, setActive);
      processed += 1;
    }
  };

  await Promise.all(Array.from({ length: workerCount }, (_, i) => worker(i)));

  state.active = [];
  state.current = null;
  return { processed };
}

/**
 * Start a run in the background (fire-and-forget). Returns immediately. Only one run at a time.
 */
export function startCrestaImportInBackground(opts: CrestaImportOptions = {}): {
  started: boolean;
  alreadyRunning: boolean;
} {
  if (state.running) return { started: false, alreadyRunning: true };
  state.running = true;
  state.stopRequested = false;
  state.startedAt = new Date().toISOString();
  state.finishedAt = null;
  state.lastError = null;
  state.active = [];
  state.current = null;
  state.options = opts;

  runCrestaImport(opts)
    .catch((err) => {
      state.lastError = String((err as Error)?.message ?? err);
      console.error('[cresta] background import failed:', err);
    })
    .finally(() => {
      state.running = false;
      state.stopRequested = false;
      state.finishedAt = new Date().toISOString();
      state.active = [];
      state.current = null;
    });

  return { started: true, alreadyRunning: false };
}
