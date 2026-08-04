import { Op } from 'sequelize';
import { RiskClassRegistry } from '../../../db/models/riskClassRegistry.models';
import {
  GENERIC_MODELING_METHOD,
  GENERIC_RATING_METHOD,
  RiskClassResolution,
  RiskClassResolvedFrom,
} from './types';

/**
 * The Risk Class Registry resolver (Slice 2).
 *
 * `resolveRiskClass` is **total**: it always returns a usable resolution, never
 * throws, never returns null. When no registry row matches — or the DB is
 * unreachable — it degrades to the generic default (exactly the spirit of
 * `loadAppetiteForTenant`, which tolerates a missing profile by returning null;
 * here we go one step further and always return a strategy).
 *
 * The pure selection logic is split into `selectResolution` so the specificity
 * ladder is unit-testable without Postgres. A thin DB wrapper loads the candidate
 * rows and delegates.
 *
 * NOTHING in the running pipeline calls this yet — Slice 2 builds the spine and
 * the socket only. Adoption is Slices 4 and 5.
 */

/**
 * The subset of a `risk_class_registry` row the pure resolver needs. Keeping it a
 * plain shape (not the Sequelize instance) is what makes `selectResolution`
 * DB-free and trivially testable.
 */
export type RegistryRow = {
  organizationId: number | null;
  lineOfBusinessCode: string;
  lineOfBusinessSubTypeCode: string;
  activeSchemaVersionId: number | null;
  riskModelingMethod: string | null;
  ratingMethod: string | null;
  appetiteDimensionsJson: Record<string, unknown> | null;
  requiredDataFieldsJson: string[] | null;
  methodParamsJson: Record<string, unknown> | null;
  status?: string | null;
};

function normalizeString(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Build the generic-default resolution. Used when no registry row matches. The
 * resolved methods are always non-empty so downstream strategy selection works.
 */
export function genericDefaultResolution(
  lineOfBusinessCode: string,
  lineOfBusinessSubTypeCode: string,
): RiskClassResolution {
  return {
    lineOfBusinessCode,
    lineOfBusinessSubTypeCode,
    schemaVersionId: null,
    riskModelingMethod: GENERIC_MODELING_METHOD,
    ratingMethod: GENERIC_RATING_METHOD,
    appetiteDimensions: {},
    requiredDataFields: [],
    methodParams: {},
    resolvedFrom: 'generic_default',
  };
}

/**
 * Build a resolution from a matched registry row, tagging where it came from.
 * Empty/unset method strings fall back to the generic method names so the
 * resolution is always usable.
 */
function resolutionFromRow(
  row: RegistryRow,
  lineOfBusinessCode: string,
  lineOfBusinessSubTypeCode: string,
  resolvedFrom: RiskClassResolvedFrom,
): RiskClassResolution {
  const modelingMethod = normalizeString(row.riskModelingMethod) || GENERIC_MODELING_METHOD;
  const ratingMethod = normalizeString(row.ratingMethod) || GENERIC_RATING_METHOD;

  return {
    lineOfBusinessCode,
    lineOfBusinessSubTypeCode,
    schemaVersionId: row.activeSchemaVersionId ?? null,
    riskModelingMethod: modelingMethod,
    ratingMethod,
    appetiteDimensions: row.appetiteDimensionsJson ?? {},
    requiredDataFields: Array.isArray(row.requiredDataFieldsJson) ? row.requiredDataFieldsJson : [],
    methodParams: row.methodParamsJson ?? {},
    resolvedFrom,
  };
}

/**
 * PURE specificity-ladder selection. Given a set of candidate registry rows and
 * the requested LOB/subtype, pick the winner and build the resolution. Never
 * throws; falls back to the generic default when no row matches.
 *
 * Ladder (first hit wins):
 *   1. org + subtype          → 'org_subtype'
 *   2. org + primary (no sub) → 'org_primary'
 *   3. platform + subtype     → 'platform_subtype'
 *   4. platform + primary     → 'platform_primary'
 *   5. (no match)             → generic default → 'generic_default'
 *
 * `organizationId` distinguishes org rows (`organizationId === organizationId`) from platform
 * rows (`organizationId === null`). When `organizationId` is null, the org rungs are
 * simply never matched and resolution starts at the platform rungs.
 *
 * Only `status === 'active'` rows (or rows with no status) are considered.
 */
export function selectResolution(
  rows: RegistryRow[],
  organizationId: number | null,
  lineOfBusinessCode: string | null,
  lineOfBusinessSubTypeCode?: string | null,
): RiskClassResolution {
  const primary = normalizeString(lineOfBusinessCode);
  const subType = normalizeString(lineOfBusinessSubTypeCode);

  const activeRows = (Array.isArray(rows) ? rows : []).filter(
    (row) => row && (row.status == null || row.status === 'active'),
  );

  const isOrg = (row: RegistryRow): boolean => organizationId != null && row.organizationId === organizationId;
  const isPlatform = (row: RegistryRow): boolean => row.organizationId == null;
  const matchesPrimary = (row: RegistryRow): boolean => normalizeString(row.lineOfBusinessCode) === primary;
  const matchesSubType = (row: RegistryRow): boolean =>
    normalizeString(row.lineOfBusinessSubTypeCode) === subType;
  const hasNoSubType = (row: RegistryRow): boolean => normalizeString(row.lineOfBusinessSubTypeCode) === '';

  // Rung 1: org + subtype (only when a subtype was requested).
  if (subType) {
    const hit = activeRows.find((row) => isOrg(row) && matchesPrimary(row) && matchesSubType(row));
    if (hit) {
      return resolutionFromRow(hit, primary, subType, 'org_subtype');
    }
  }

  // Rung 2: org + primary (subtype-agnostic row, i.e. blank subtype).
  if (primary) {
    const hit = activeRows.find((row) => isOrg(row) && matchesPrimary(row) && hasNoSubType(row));
    if (hit) {
      return resolutionFromRow(hit, primary, subType, 'org_primary');
    }
  }

  // Rung 3: platform + subtype.
  if (subType) {
    const hit = activeRows.find((row) => isPlatform(row) && matchesPrimary(row) && matchesSubType(row));
    if (hit) {
      return resolutionFromRow(hit, primary, subType, 'platform_subtype');
    }
  }

  // Rung 4: platform + primary.
  if (primary) {
    const hit = activeRows.find((row) => isPlatform(row) && matchesPrimary(row) && hasNoSubType(row));
    if (hit) {
      return resolutionFromRow(hit, primary, subType, 'platform_primary');
    }
  }

  // Rung 5: generic default.
  return genericDefaultResolution(primary, subType);
}

/**
 * Load candidate registry rows for the given scope. Pulls every row that could
 * possibly match the ladder (this org's rows + platform rows for this primary
 * code) so the pure selector can pick the winner. Kept thin and DB-only.
 */
async function loadCandidateRows(
  organizationId: number | null,
  lineOfBusinessCode: string,
): Promise<RegistryRow[]> {
  // Match this org's rows OR platform rows (organizationId IS NULL). `Op.or` keeps
  // the nullable membership well-typed (a plain `[id, null]` array is not).
  const organizationIdClause =
    organizationId != null ? { [Op.or]: [{ [Op.eq]: organizationId }, { [Op.is]: null }] } : { [Op.is]: null };

  const rows = await RiskClassRegistry.findAll({
    where: {
      organizationId: organizationIdClause,
      lineOfBusinessCode,
      status: 'active',
    },
  });

  return rows.map((row) => ({
    organizationId: row.organizationId,
    lineOfBusinessCode: row.lineOfBusinessCode,
    lineOfBusinessSubTypeCode: row.lineOfBusinessSubTypeCode,
    activeSchemaVersionId: row.activeSchemaVersionId,
    riskModelingMethod: row.riskModelingMethod,
    ratingMethod: row.ratingMethod,
    appetiteDimensionsJson: row.appetiteDimensionsJson ?? {},
    requiredDataFieldsJson: row.requiredDataFieldsJson ?? [],
    methodParamsJson: row.methodParamsJson ?? {},
    status: row.status,
  }));
}

/**
 * Resolve a risk class to its declared strategy/dimension bundle. ALWAYS returns
 * a resolution. On any DB error, degrades to the generic default rather than
 * throwing, so a resolver failure can never break a caller.
 */
export async function resolveRiskClass(
  organizationId: number | null,
  lineOfBusinessCode: string | null,
  lineOfBusinessSubTypeCode?: string | null,
): Promise<RiskClassResolution> {
  const primary = normalizeString(lineOfBusinessCode);
  const subType = normalizeString(lineOfBusinessSubTypeCode);

  // No primary code ⇒ nothing to look up; generic default immediately.
  if (!primary) {
    return genericDefaultResolution(primary, subType);
  }

  try {
    const rows = await loadCandidateRows(organizationId, primary);
    return selectResolution(rows, organizationId, primary, subType);
  } catch {
    // Degrade like loadAppetiteForTenant tolerates failure — never throw.
    return genericDefaultResolution(primary, subType);
  }
}
