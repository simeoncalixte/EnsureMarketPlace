import { validateCanonicalData, ValidationError } from '../schema/compile';

/**
 * Slice 3 — pure, DB-free pin & enforcement logic.
 *
 * These functions hold ALL the logic-bearing decisions of Slice 3 so they can be
 * unit-tested without Postgres (mirroring how Slices 1-2 split pure logic from the
 * thin DB wrappers). The DB wrapper (`service.ts`) loads candidate published
 * schema versions and the pinned version's compiled schema, then delegates here.
 *
 * NON-DEGRADATION INVARIANT: every "no schema published" / "cannot map" / "error"
 * path resolves to `pinId: null`, which downstream means NO enforcement and a
 * byte-for-byte-unchanged canonicalization. The only way enforcement engages is a
 * genuine, resolved pin.
 */

/**
 * The minimal shape of a candidate published `risk_class_schema_versions` row the
 * pure pin decision needs. The DB wrapper maps Sequelize rows down to this.
 */
export type CandidatePublishedVersion = {
  id: number;
  schemaVersion: number;
  /** 'published' rows are pinnable; anything else (e.g. 'archived') is ignored. */
  status?: string | null;
};

export type PinDecision = {
  /** The schema version id to stamp, or null for the no-op / unpinned path. */
  pinId: number | null;
  /** Why we arrived at this decision (for logging / tests). */
  reason:
    | 'reuse_existing_pin' // replay: submission already pinned, reuse it
    | 'no_lob' // could not derive a taxonomy primary code → no pin
    | 'registry_active' // registry's active_schema_version_id was provided
    | 'latest_published' // latest published version for the scope
    | 'no_published_version'; // scope has no published schema → no pin
};

/**
 * Decide which schema version (if any) a submission should be pinned to.
 *
 * REPLAY SEMANTICS: if the submission is ALREADY pinned (`existingPinId` is a
 * number), that pin is reused verbatim and no re-resolution happens — so replaying
 * an old submission validates against the exact version it was created under,
 * preserving append-only replay semantics.
 *
 * FIRST-TIME PINNING (existingPinId == null):
 *   - If no taxonomy primary code was derived → no pin (no-op path).
 *   - Else prefer the registry's `activeSchemaVersionId` when supplied AND it
 *     appears among the published candidates (so we never pin to an archived /
 *     non-existent active id).
 *   - Else pin to the latest published candidate version for the scope.
 *   - If there are no published candidates → no pin (no-op path).
 *
 * Pure: same inputs → same decision. Never throws.
 */
export function derivePin(params: {
  existingPinId: number | null | undefined;
  primaryCode: string | null;
  registryActiveSchemaVersionId: number | null | undefined;
  candidatePublishedVersions: CandidatePublishedVersion[];
}): PinDecision {
  // Replay / re-run: an existing pin is authoritative and is never re-resolved.
  if (typeof params.existingPinId === 'number') {
    return { pinId: params.existingPinId, reason: 'reuse_existing_pin' };
  }

  // No confidently-derived line of business ⇒ no pin ⇒ no enforcement.
  if (!params.primaryCode) {
    return { pinId: null, reason: 'no_lob' };
  }

  const published = (Array.isArray(params.candidatePublishedVersions) ? params.candidatePublishedVersions : [])
    .filter((v) => v && (v.status == null || v.status === 'published'));

  if (published.length === 0) {
    return { pinId: null, reason: 'no_published_version' };
  }

  // Prefer the registry's declared active version, but only if it is actually a
  // published candidate for this scope (guards against a stale/archived pointer).
  const activeId = params.registryActiveSchemaVersionId;
  if (typeof activeId === 'number') {
    const active = published.find((v) => v.id === activeId);
    if (active) {
      return { pinId: active.id, reason: 'registry_active' };
    }
  }

  // Otherwise: latest published version for the scope.
  const latest = published.reduce((best, v) => (v.schemaVersion > best.schemaVersion ? v : best), published[0]);
  return { pinId: latest.id, reason: 'latest_published' };
}

export type EnforcementResult =
  | { enforced: false; reason: 'no_pin' | 'no_compiled_schema' }
  | { enforced: true; ok: true }
  | { enforced: true; ok: false; errors: ValidationError[] };

/**
 * Decide and run enforcement. Enforcement engages ONLY when:
 *   - a pin id is present, AND
 *   - a compiled JSON schema was loaded for that pin.
 *
 * In every other case it reports `enforced: false` and the caller skips the
 * `{ok:false}` contract entirely — the unpinned/legacy path is untouched.
 *
 * When enforcement engages it delegates to Slice 1's `validateCanonicalData`,
 * returning the validation outcome so the caller can surface `{ok:false}` with the
 * errors. Pure: no I/O. Never throws (a malformed compiled schema is caught and
 * degraded to `no_compiled_schema` rather than crashing the pipeline).
 */
export function decideEnforcement(
  pinId: number | null,
  data: unknown,
  compiledSchema: Record<string, unknown> | null | undefined,
): EnforcementResult {
  if (pinId == null) {
    return { enforced: false, reason: 'no_pin' };
  }
  if (!compiledSchema || typeof compiledSchema !== 'object') {
    return { enforced: false, reason: 'no_compiled_schema' };
  }

  try {
    const result = validateCanonicalData(data, compiledSchema);
    if (result.ok) {
      return { enforced: true, ok: true };
    }
    return { enforced: true, ok: false, errors: result.errors };
  } catch {
    // A compiled schema that Ajv refuses to compile must NOT crash the pipeline.
    // Degrade to "not enforceable" rather than throwing out of the happy path.
    return { enforced: false, reason: 'no_compiled_schema' };
  }
}
