// Seeding API — requests under `/api/seed`.
//
// Seed endpoints are driven dynamically (admin form routes, the simulation
// engine), so the primary entry point is the flexible `seedRoute`. `route` may
// be a relative `/api/seed/...` path (the base is resolved by apiFetch) or an
// absolute URL (passed through unchanged). Named wrappers exist for the two
// fixed endpoints so they read clearly. Every function returns the raw
// `Response`: callers parse `res.clone().json()` and format their own status.
import { apiRequest, type ApiFetchOptions } from './client';

export type SeedOpts = {
  method?: string;
  useAuth?: boolean;
  headers?: Record<string, string>;
};

/** POST (or `opts.method`) to a seed route with an optional JSON body. */
export function seedRoute(route: string, body?: unknown, opts: SeedOpts = {}): Promise<Response> {
  const init: ApiFetchOptions = { method: opts.method ?? 'POST', useAuth: opts.useAuth };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json', ...opts.headers };
    init.body = JSON.stringify(body);
  } else if (opts.headers) {
    init.headers = opts.headers;
  }
  return apiRequest(route, init);
}

/** Options for seeding incoming pipeline submissions. */
export type SeedPipelineSubmissionsOpts = {
  /** Business scenario to seed ('weighted' = standard mix). */
  scenario?: string;
  /**
   * Pin the transaction type for the batch ('auto' = let the pipeline decide) so
   * each card is unambiguously a new-business / renewal / endorsement / … etc.
   */
  submissionType?: string;
};

/** POST /api/seed/pipeline-submissions — seed incoming pipeline submissions. */
export function seedPipelineSubmissions(
  count: number,
  opts: SeedPipelineSubmissionsOpts = {},
): Promise<Response> {
  const body: Record<string, unknown> = { count };
  if (opts.scenario && opts.scenario !== 'weighted') body.scenario = opts.scenario;
  if (opts.submissionType && opts.submissionType !== 'auto') body.submissionType = opts.submissionType;
  return seedRoute('/api/seed/pipeline-submissions', body);
}

/** POST /api/seed/purge-submissions — destructive reset of all submissions. */
export function purgeSubmissions(): Promise<Response> {
  return seedRoute('/api/seed/purge-submissions', { confirm: true });
}

/** POST /api/seed/worldcities — start the (background) worldcities.csv import. Raw Response. */
export function startWorldcitiesImport(body?: { file?: string }): Promise<Response> {
  return seedRoute('/api/seed/worldcities', body ?? {});
}

/** GET /api/seed/worldcities/status — import run state + live row counts (polled). Raw Response. */
export function getWorldcitiesStatus(): Promise<Response> {
  return apiRequest('/api/seed/worldcities/status', { method: 'GET' });
}

/** POST /api/seed/worldcities/stop — cooperatively stop a running import. Raw Response. */
export function stopWorldcitiesImport(): Promise<Response> {
  return seedRoute('/api/seed/worldcities/stop');
}
