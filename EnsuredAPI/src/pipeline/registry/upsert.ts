import { RiskClassRegistry } from '../../db/models/riskClassRegistry.models';

/**
 * Registry upsert decision + DB-backed upsert (Slice 2).
 *
 * A risk-class registry declaration is DATA, not code. `PUT .../registry`
 * upserts the row for an (org, primary, subtype) scope: update in place when one
 * exists, otherwise create. The decision is split into a pure, unit-testable
 * function so it does not need Postgres.
 */

/** The editable declaration fields a caller may set. */
export type RegistryDeclaration = {
  activeSchemaVersionId?: number | null;
  riskModelingMethod?: string | null;
  ratingMethod?: string | null;
  appetiteDimensionsJson?: Record<string, unknown>;
  requiredDataFieldsJson?: string[];
  methodParamsJson?: Record<string, unknown>;
  status?: 'active' | 'inactive';
  createdByUserId?: number | null;
};

export type UpsertRegistryParams = {
  organizationId: number | null;
  lineOfBusinessCode: string;
  lineOfBusinessSubTypeCode: string;
} & RegistryDeclaration;

export type UpsertRegistryDecision =
  | { action: 'update'; updateId: number }
  | { action: 'create' };

/**
 * Pure decision: given the existing rows for the same (org, primary, subtype)
 * scope, decide whether the upsert updates an existing row or creates a new one.
 * First exact-scope match wins; otherwise create.
 */
export function decideRegistryUpsert(
  existingRows: Array<{ id: number; organizationId: number | null; lineOfBusinessCode: string; lineOfBusinessSubTypeCode: string }>,
  organizationId: number | null,
  lineOfBusinessCode: string,
  lineOfBusinessSubTypeCode: string,
): UpsertRegistryDecision {
  const match = (Array.isArray(existingRows) ? existingRows : []).find(
    (row) =>
      row.organizationId === organizationId &&
      row.lineOfBusinessCode === lineOfBusinessCode &&
      row.lineOfBusinessSubTypeCode === lineOfBusinessSubTypeCode,
  );

  if (match) {
    return { action: 'update', updateId: match.id };
  }
  return { action: 'create' };
}

/** Build the set of column values to write, applying only provided fields. */
function buildWriteValues(params: UpsertRegistryParams) {
  const values: Record<string, unknown> = {};
  if (params.activeSchemaVersionId !== undefined) values.activeSchemaVersionId = params.activeSchemaVersionId ?? null;
  if (params.riskModelingMethod !== undefined) values.riskModelingMethod = params.riskModelingMethod ?? null;
  if (params.ratingMethod !== undefined) values.ratingMethod = params.ratingMethod ?? null;
  if (params.appetiteDimensionsJson !== undefined) values.appetiteDimensionsJson = params.appetiteDimensionsJson ?? {};
  if (params.requiredDataFieldsJson !== undefined) values.requiredDataFieldsJson = params.requiredDataFieldsJson ?? [];
  if (params.methodParamsJson !== undefined) values.methodParamsJson = params.methodParamsJson ?? {};
  if (params.status !== undefined) values.status = params.status ?? 'active';
  return values;
}

/**
 * DB-backed upsert of a registry declaration for an (org, primary, subtype)
 * scope. Returns the persisted row. The unique index
 * `(organization_id, line_of_business_code, line_of_business_sub_type_code)`
 * guarantees at most one row per scope.
 */
export async function upsertRegistry(params: UpsertRegistryParams): Promise<RiskClassRegistry> {
  const organizationId = params.organizationId ?? null;
  const lineOfBusinessCode = params.lineOfBusinessCode;
  const lineOfBusinessSubTypeCode = params.lineOfBusinessSubTypeCode ?? '';

  const existing = await RiskClassRegistry.findOne({
    where: { organizationId, lineOfBusinessCode, lineOfBusinessSubTypeCode },
  });

  const writeValues = buildWriteValues(params);

  if (existing) {
    return existing.update(writeValues);
  }

  return RiskClassRegistry.create({
    organizationId,
    lineOfBusinessCode,
    lineOfBusinessSubTypeCode,
    activeSchemaVersionId: params.activeSchemaVersionId ?? null,
    riskModelingMethod: params.riskModelingMethod ?? null,
    ratingMethod: params.ratingMethod ?? null,
    appetiteDimensionsJson: params.appetiteDimensionsJson ?? {},
    requiredDataFieldsJson: params.requiredDataFieldsJson ?? [],
    methodParamsJson: params.methodParamsJson ?? {},
    status: params.status ?? 'active',
    createdByUserId: params.createdByUserId ?? null,
  });
}
