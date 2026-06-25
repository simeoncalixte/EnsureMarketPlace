import { CanonicalSubmission } from '../../db/models';
import { RiskClassSchemaVersion } from '../../db/models/riskClassSchema.models';
import { PAGE_KEY } from '../schemaGeneration/logic';
import { resolveRiskClass } from '../registry/resolve';
import { ValidationError } from '../schema/compile';
import { deriveLobCodes } from './deriveLob';
import {
  CandidatePublishedVersion,
  decideEnforcement,
  derivePin,
} from './pin';

/**
 * Slice 3 — pin submissions on canonicalization + opt-in schema enforcement.
 *
 * This is the thin DB wrapper around the pure logic in `deriveLob.ts` / `pin.ts`.
 * It is the ONLY new write at the canonicalization point and it is engineered to
 * be a STRICT NO-OP for any org that has not published a schema for the
 * submission's risk class:
 *
 *   - If no taxonomy code can be derived, OR no published schema version resolves,
 *     `schemaVersionId` stays NULL, NO validation runs, and the canonical `data`
 *     written is byte-for-byte what the caller passed in.
 *   - Any internal error (resolution / derivation / load) is swallowed and
 *     degrades to "no pin, skip enforcement" — it NEVER throws out of the happy
 *     path that exists today.
 *   - The ONLY way this surfaces a failure to the caller is the intended opt-in
 *     enforcement: a genuinely pinned submission whose data fails validation.
 */

const CANONICAL_PAGE_KEY = PAGE_KEY;

export type CanonicalizePinOutcome =
  | { status: 'skipped'; reason: string }
  | { status: 'pinned'; schemaVersionId: number; enforced: boolean }
  | { status: 'enforcement_failed'; schemaVersionId: number; errors: ValidationError[] };

export type CanonicalizeAndPinParams = {
  submissionId: number;
  organizationId: number | null;
  /** The canonical data to persist (the normalized/extracted record). */
  data: Record<string, unknown>;
  /** Optional free-text / structured LOB hints pulled from the data. */
  lob?: {
    lineOfBusiness?: unknown;
    lineOfBusinessCode?: unknown;
    lineOfBusinessSubTypeCode?: unknown;
  };
  pageKey?: string;
};

/**
 * Load the published schema versions for a scope, mapped to the pure
 * `CandidatePublishedVersion` shape. Thin and DB-only.
 */
async function loadPublishedVersions(
  organizationId: number | null,
  lineOfBusinessCode: string,
  lineOfBusinessSubTypeCode: string,
  pageKey: string,
): Promise<CandidatePublishedVersion[]> {
  const rows = await RiskClassSchemaVersion.findAll({
    where: {
      organizationId,
      lineOfBusinessCode,
      lineOfBusinessSubTypeCode,
      pageKey,
      status: 'published',
    },
    order: [['schemaVersion', 'ASC']],
  });

  return rows.map((row) => ({
    id: row.id,
    schemaVersion: row.schemaVersion,
    status: row.status,
  }));
}

/**
 * Canonicalize a submission: upsert the `CanonicalSubmission` row with the given
 * `data`, derive/stamp the taxonomy codes, resolve and pin the active published
 * schema version (first time only), and run opt-in enforcement when pinned.
 *
 * Returns a structured outcome. `status: 'enforcement_failed'` is the ONLY outcome
 * the caller should surface via the stage `{ok:false}` contract; every other
 * outcome means the canonicalization succeeded (with or without a pin).
 *
 * IMPORTANT: this function itself does not throw for the no-op path. A
 * DB-write failure in the upsert WILL propagate (so a real persistence failure is
 * still a stage failure, consistent with the existing normalization contract), but
 * the pin/enforcement *decision* logic around it is fully guarded.
 */
export async function canonicalizeAndPin(
  params: CanonicalizeAndPinParams,
): Promise<CanonicalizePinOutcome> {
  const pageKey = params.pageKey ?? CANONICAL_PAGE_KEY;

  // Best-effort LOB derivation. Pull hints from the explicit `lob` param, falling
  // back to fields inside `data`. Conservative: unmapped ⇒ null ⇒ no pin.
  const lobInput = params.lob ?? {
    lineOfBusiness: params.data?.lineOfBusiness,
    lineOfBusinessCode: params.data?.lineOfBusinessCode,
    lineOfBusinessSubTypeCode: params.data?.lineOfBusinessSubTypeCode,
  };
  const derived = safeDeriveLob(lobInput);

  // Load (or create) the canonical row first. Replay reuses an existing pin.
  const existing = await CanonicalSubmission.findOne({ where: { submissionId: params.submissionId } });
  const existingPinId = existing?.schemaVersionId ?? null;

  // Resolve the pin. ALL of this is guarded; on any error we degrade to no pin.
  let pinId: number | null = existingPinId;
  if (existingPinId == null) {
    pinId = await resolveFirstTimePin(params.organizationId, derived.primaryCode, derived.subTypeCode, pageKey);
  }

  // Persist the canonical row (data + taxonomy codes + pin). This is the canonical
  // write. Codes are stamped additively; they are null when underived.
  const persisted = await upsertCanonical(existing, {
    submissionId: params.submissionId,
    organizationId: params.organizationId,
    data: params.data,
    lineOfBusinessCode: derived.primaryCode,
    lineOfBusinessSubTypeCode: derived.subTypeCode,
    schemaVersionId: pinId,
  });

  // No pin ⇒ strict no-op for enforcement.
  if (pinId == null) {
    return { status: 'skipped', reason: derived.primaryCode ? 'no_published_version' : 'no_lob' };
  }

  // Opt-in enforcement: load the pinned immutable version's compiled schema and run
  // Slice 1 validation. Loading is guarded; a load failure degrades to "pinned, not
  // enforced" rather than failing the pipeline.
  const compiledSchema = await safeLoadCompiledSchema(pinId);
  const enforcement = decideEnforcement(pinId, persisted.data ?? {}, compiledSchema);

  if (enforcement.enforced && enforcement.ok === false) {
    return { status: 'enforcement_failed', schemaVersionId: pinId, errors: enforcement.errors };
  }

  return { status: 'pinned', schemaVersionId: pinId, enforced: enforcement.enforced };
}

/**
 * Resolve the first-time pin for a scope. Prefers the registry's active version
 * (via Slice-2 `resolveRiskClass`) when it is among the published candidates, else
 * the latest published version. Fully guarded: any error ⇒ null (no pin).
 */
async function resolveFirstTimePin(
  organizationId: number | null,
  primaryCode: string | null,
  subTypeCode: string | null,
  pageKey: string,
): Promise<number | null> {
  if (!primaryCode) {
    return null;
  }

  try {
    const subType = subTypeCode ?? '';

    // Slice-2 registry resolution gives us the declared active_schema_version_id
    // (or null). It is total and never throws.
    const resolution = await resolveRiskClass(organizationId, primaryCode, subType || null);

    // Candidate published versions for the exact scope. Try the subtype scope
    // first; if the submission has no subtype (or none published), fall back to the
    // primary-only scope (subtype === '').
    let candidates = await loadPublishedVersions(organizationId, primaryCode, subType, pageKey);
    if (candidates.length === 0 && subType) {
      candidates = await loadPublishedVersions(organizationId, primaryCode, '', pageKey);
    }

    const decision = derivePin({
      existingPinId: null,
      primaryCode,
      registryActiveSchemaVersionId: resolution.schemaVersionId,
      candidatePublishedVersions: candidates,
    });

    return decision.pinId;
  } catch {
    // Resolution/derivation failure must never break the unpinned path.
    return null;
  }
}

/** Load a pinned version's compiled JSON schema. Guarded: returns null on error. */
async function safeLoadCompiledSchema(schemaVersionId: number): Promise<Record<string, unknown> | null> {
  try {
    const version = await RiskClassSchemaVersion.findByPk(schemaVersionId);
    const compiled = version?.compiledJsonSchema;
    if (compiled && typeof compiled === 'object') {
      return compiled as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

/** Derive LOB codes, swallowing any (unexpected) error into the safe null result. */
function safeDeriveLob(input: {
  lineOfBusiness?: unknown;
  lineOfBusinessCode?: unknown;
  lineOfBusinessSubTypeCode?: unknown;
}): { primaryCode: string | null; subTypeCode: string | null } {
  try {
    return deriveLobCodes(input);
  } catch {
    return { primaryCode: null, subTypeCode: null };
  }
}

/** Create or update the canonical row. The single canonicalization write. */
async function upsertCanonical(
  existing: CanonicalSubmission | null,
  values: {
    submissionId: number;
    organizationId: number | null;
    data: Record<string, unknown>;
    lineOfBusinessCode: string | null;
    lineOfBusinessSubTypeCode: string | null;
    schemaVersionId: number | null;
  },
): Promise<CanonicalSubmission> {
  if (!existing) {
    return CanonicalSubmission.create({
      submissionId: values.submissionId,
      organizationId: values.organizationId,
      data: values.data,
      version: 1,
      schemaVersionId: values.schemaVersionId,
      lineOfBusinessCode: values.lineOfBusinessCode,
      lineOfBusinessSubTypeCode: values.lineOfBusinessSubTypeCode,
    });
  }

  existing.data = values.data;
  existing.organizationId = values.organizationId ?? existing.organizationId;
  // Replay preserves the original pin: only stamp when not already pinned.
  if (existing.schemaVersionId == null) {
    existing.schemaVersionId = values.schemaVersionId;
  }
  // Taxonomy codes are stamped only when derived (don't clobber an earlier stamp
  // with a null on a re-run that failed to re-derive).
  if (values.lineOfBusinessCode != null) {
    existing.lineOfBusinessCode = values.lineOfBusinessCode;
  }
  if (values.lineOfBusinessSubTypeCode != null) {
    existing.lineOfBusinessSubTypeCode = values.lineOfBusinessSubTypeCode;
  }
  await existing.save();
  return existing;
}
