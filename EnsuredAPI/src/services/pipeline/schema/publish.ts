import type { PageTemplateDefinition } from '../../../db/models/pageTemplates.models';
import { RiskClassSchemaVersion } from '../../../db/models/riskClassSchema.models';
import { compileToJsonSchema, computeContentHash } from './compile';

/**
 * Pure publish-decision logic, separated from any DB access so it is unit-testable
 * without a database.
 *
 * Publishing is idempotent via `content_hash`: republishing identical definition
 * content is a no-op that returns the existing version rather than creating a new
 * row. This mirrors the `(organization_id, content_hash)` unique index.
 */

export type ExistingPublishedVersion = {
  id: number;
  schemaVersion: number;
  contentHash: string;
};

export type PublishDecision =
  | { action: 'reuse'; reuseId: number; schemaVersion: number; contentHash: string }
  | { action: 'create'; schemaVersion: number; contentHash: string };

/**
 * Decide whether publishing `definitionJson` should create a new immutable version
 * or reuse an existing one with identical content.
 *
 * @param definitionJson    the draft template definition being published
 * @param existingVersions  all published versions for the same
 *                          (org, LOB, subtype, page) scope, in any order
 */
export function decidePublish(
  definitionJson: PageTemplateDefinition,
  existingVersions: ExistingPublishedVersion[],
): PublishDecision {
  const contentHash = computeContentHash(definitionJson);

  const identical = existingVersions.find((version) => version.contentHash === contentHash);
  if (identical) {
    return {
      action: 'reuse',
      reuseId: identical.id,
      schemaVersion: identical.schemaVersion,
      contentHash,
    };
  }

  const maxVersion = existingVersions.reduce((max, version) => Math.max(max, version.schemaVersion), 0);
  return {
    action: 'create',
    schemaVersion: maxVersion + 1,
    contentHash,
  };
}

export type PublishSchemaVersionParams = {
  organizationId: number | null;
  lineOfBusinessCode: string;
  lineOfBusinessSubTypeCode: string;
  pageKey: string;
  definitionJson: PageTemplateDefinition;
  sourceTemplateId?: number | null;
  baseSchemaVersionId?: number | null;
  publishedByUserId?: number | null;
};

export type PublishSchemaVersionResult = {
  version: RiskClassSchemaVersion;
  created: boolean;
};

/**
 * DB-backed publish: compiles the draft into an immutable, content-addressed
 * `risk_class_schema_versions` row. Idempotent — republishing identical content
 * returns the existing row (`created: false`).
 *
 * Existing published versions are never mutated; an edit always produces a new
 * `schema_version`, so an in-flight submission pinned to an older version is never
 * retroactively changed.
 */
export async function publishSchemaVersion(
  params: PublishSchemaVersionParams,
): Promise<PublishSchemaVersionResult> {
  const organizationId = params.organizationId ?? null;
  const lineOfBusinessCode = params.lineOfBusinessCode ?? '';
  const lineOfBusinessSubTypeCode = params.lineOfBusinessSubTypeCode ?? '';
  const pageKey = params.pageKey;

  const existingRows = await RiskClassSchemaVersion.findAll({
    where: {
      organizationId,
      lineOfBusinessCode,
      lineOfBusinessSubTypeCode,
      pageKey,
    },
    order: [['schemaVersion', 'ASC']],
  });

  const decision = decidePublish(
    params.definitionJson,
    existingRows.map((row) => ({ id: row.id, schemaVersion: row.schemaVersion, contentHash: row.contentHash })),
  );

  if (decision.action === 'reuse') {
    const existing = existingRows.find((row) => row.id === decision.reuseId);
    if (existing) {
      return { version: existing, created: false };
    }
  }

  const compiledJsonSchema = compileToJsonSchema(params.definitionJson);

  const created = await RiskClassSchemaVersion.create({
    organizationId,
    lineOfBusinessCode,
    lineOfBusinessSubTypeCode,
    pageKey,
    sourceTemplateId: params.sourceTemplateId ?? null,
    schemaVersion: decision.schemaVersion,
    status: 'published',
    baseSchemaVersionId: params.baseSchemaVersionId ?? null,
    definitionJson: params.definitionJson,
    compiledJsonSchema: compiledJsonSchema as unknown as Record<string, unknown>,
    contentHash: decision.contentHash,
    publishedByUserId: params.publishedByUserId ?? null,
    publishedAt: new Date(),
  });

  return { version: created, created: true };
}
