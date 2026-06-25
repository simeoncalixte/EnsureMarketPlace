/**
 * Submission-type-driven pipeline ROUTING (pure, no I/O).
 *
 * The board used to advance every submission down one hard-coded linear order
 * (`PIPELINE_STAGES[i+1]`). But a claim, an endorsement, a cancellation and a
 * treaty placement need DIFFERENT paths — most of the new-business underwriting
 * tail (appetite, schema generation, pricing, bind) is meaningless for them.
 *
 * This module turns the path into DATA: a registry mapping each submission-type
 * code (see `submissionTypeTaxonomy`) to the ordered stage keys it should run.
 * The orchestrator resolves the route for a submission and advances WITHIN it.
 *
 * Design invariants (enforced by routes.test.ts):
 *  1. Every route is a SUBSEQUENCE of `CANONICAL_STAGE_ORDER` — stages keep their
 *     left-to-right board order; a route only ever omits stages, never reorders
 *     or moves a submission "backwards" on the board.
 *  2. Every route begins with `SHARED_PREFIX` — the stages that must run before
 *     the submission type is even known (ingestion → ocr → submissionType). The
 *     `submissionType` stage is the fork point: until it has run, the resolver
 *     uses the default route, and since every route shares this prefix the early
 *     advances are identical regardless of the eventual type.
 *  3. Route keys only reference stages that exist in the board (have a runner).
 *
 * Net-new, type-specific stages (claims handling, endorsement delta/re-rate,
 * reinsurance treaty analysis) are NOT invented here — the interim routes below
 * stop at the last existing stage that is honest for the type, and the target
 * tails are specified in pipeline-routing.ROADMAP.md for incremental build-out.
 */

/**
 * The full, canonical stage order (the new-business path). This MUST mirror the
 * board's `PIPELINE_STAGE_CATALOG` order; routes.test.ts asserts they match so a
 * stage added to the board can never silently fall out of routing.
 */
export const CANONICAL_STAGE_ORDER: readonly string[] = [
  'ingestion',
  'ocr',
  'submissionType',
  'classification',
  'assignment',
  'extraction',
  'insuredSubject',
  'locationDiscovery',
  'normalization',
  'validation',
  'schemaGeneration',
  'workflow',
  'riskCompute',
  'preBindCompliance',
];

/** Stages that always run before the submission type is known (the fork point). */
export const SHARED_PREFIX: readonly string[] = ['ingestion', 'ocr', 'submissionType'];

/** Route key used when a submission's type is unknown or has no bespoke route. */
export const DEFAULT_ROUTE_KEY = 'default';

/** The full underwriting path — new business and anything that should run it. */
const FULL_ROUTE: string[] = [...CANONICAL_STAGE_ORDER];

/**
 * Registry: submission-type code → ordered stage keys. Anything absent here
 * falls back to {@link FULL_ROUTE} (see `routeForType`). Codes mirror
 * `submissionTypeTaxonomy`.
 *
 * INTERIM routes (claim/treaty/audit/cancellation/inquiry) deliberately stop at
 * the last EXISTING stage that is honest for the type rather than dragging the
 * submission through pricing/bind it should never see. Their target tails (with
 * net-new stages) live in pipeline-routing.ROADMAP.md.
 */
export const PIPELINE_ROUTES: Readonly<Record<string, readonly string[]>> = {
  // Full underwriting path.
  new_business: FULL_ROUTE,
  quote_request: FULL_ROUTE,
  renewal: FULL_ROUTE, // interim: real renewal needs a policy-locate + prior-term diff (see ROADMAP)
  facultative_reinsurance: FULL_ROUTE, // single-risk cession; reinsurance-side pricing tail pending

  // Endorsement: an existing policy change. Re-rate the delta and clear
  // compliance, but DON'T regenerate a brand-new submission schema.
  endorsement: FULL_ROUTE.filter((k) => k !== 'schemaGeneration'),

  // Cancellation: identify the policy + effective date, then compliance. No
  // classification / appetite / pricing / schema / workflow.
  cancellation: ['ingestion', 'ocr', 'submissionType', 'extraction', 'normalization', 'preBindCompliance'],

  // Claim / loss notice: structure the loss data and stop. The real claims tail
  // (coverage verification, reserving, adjuster assignment) is net-new (ROADMAP).
  claim: ['ingestion', 'ocr', 'submissionType', 'extraction', 'insuredSubject', 'locationDiscovery', 'normalization'],

  // Treaty reinsurance: capture treaty terms. Portfolio/treaty analysis is
  // net-new (ROADMAP) — do NOT run single-risk pricing.
  treaty_reinsurance: ['ingestion', 'ocr', 'submissionType', 'extraction', 'normalization'],

  // Premium audit: capture audited exposures. Audit reconciliation is net-new.
  audit: ['ingestion', 'ocr', 'submissionType', 'extraction', 'normalization'],

  // Inquiry / other: triage only, then hand to a human. No automated processing.
  inquiry: [...SHARED_PREFIX],
};

export type ResolvedRoute = {
  /** The submission-type code this route was selected for, or 'default'. */
  routeKey: string;
  /** Ordered stage keys the submission should traverse. */
  keys: string[];
};

/** Canonical index of a stage key (−1 if not a known stage). */
function canonicalIndex(key: string): number {
  return CANONICAL_STAGE_ORDER.indexOf(key);
}

/**
 * Resolve the ordered stage keys for a submission type. Unknown / null / empty
 * types (e.g. before the `submissionType` stage has run, or a type with no
 * bespoke route) fall back to the full default route.
 */
export function routeForType(typeCode?: string | null): ResolvedRoute {
  const code = String(typeCode ?? '').trim();
  const bespoke = code ? PIPELINE_ROUTES[code] : undefined;
  if (bespoke) return { routeKey: code, keys: [...bespoke] };
  return { routeKey: DEFAULT_ROUTE_KEY, keys: [...FULL_ROUTE] };
}

/**
 * The next stage to run after `currentKey`, within `routeKeys`. Resolved by
 * CANONICAL index rather than array position, so it behaves correctly even when
 * `currentKey` itself was trimmed out of the route (it returns the first route
 * stage that comes AFTER the current one in canonical order). Returns null at the
 * end of the route.
 */
export function nextStageKeyInRoute(routeKeys: readonly string[], currentKey: string): string | null {
  const ci = canonicalIndex(currentKey);
  for (const key of routeKeys) {
    if (canonicalIndex(key) > ci) return key;
  }
  return null;
}

/**
 * The stage immediately BEFORE `targetKey` within the route (by canonical order)
 * — the "from" stage a re-run feeds its target. Falls back to `targetKey` itself
 * when the target is first in the route (mirrors the old `[index-1] ?? target`).
 */
export function prevStageKeyInRoute(routeKeys: readonly string[], targetKey: string): string {
  const ti = canonicalIndex(targetKey);
  let prev: string | null = null;
  for (const key of routeKeys) {
    if (canonicalIndex(key) < ti) prev = key;
    else break;
  }
  return prev ?? targetKey;
}

/**
 * Apply a per-org enable/disable override: drop `disabled` stage keys from the
 * route. `protectedKeys` (default {@link SHARED_PREFIX}) are never dropped — an
 * org cannot switch off the stages needed to even determine the type/route.
 */
export function applyEnabledOverride(
  routeKeys: readonly string[],
  disabled: Iterable<string>,
  protectedKeys: readonly string[] = SHARED_PREFIX,
): string[] {
  const drop = new Set(disabled);
  const keep = new Set(protectedKeys);
  return routeKeys.filter((k) => keep.has(k) || !drop.has(k));
}

/** True iff `keys` is a subsequence of `CANONICAL_STAGE_ORDER` (invariant #1). */
export function isCanonicalSubsequence(keys: readonly string[]): boolean {
  let last = -1;
  for (const key of keys) {
    const idx = canonicalIndex(key);
    if (idx < 0 || idx <= last) return false;
    last = idx;
  }
  return true;
}
