import { getSequelize } from '../db/config/database';
import type { ModelStatic, Model } from 'sequelize';

/**
 * Builds a dot-notation field catalog from the *actual* Sequelize models so the
 * rules engine can reference real data points instead of free-typed strings.
 *
 * Organization-awareness: only models that carry an `organizationId` column are
 * exposed as roots, and association traversal only descends through singular
 * (`belongsTo` / `hasOne`) links. Every path therefore originates at an
 * org-scoped record, so a rule built from this catalog can only ever reference
 * data belonging to the querying organization. The route layer additionally
 * resolves the organization from the caller's token before returning this.
 */

export type CatalogFieldKind = 'text' | 'number' | 'boolean' | 'date' | 'json' | 'uuid';

export interface CatalogField {
  /** Dot-notation path, e.g. `submission.status` or `policy.address.countryCode`. */
  path: string;
  /** Human label for the leaf segment. */
  label: string;
  kind: CatalogFieldKind;
  nullable: boolean;
  /** Association chain this field is reached through (undefined for own fields). */
  via?: string;
}

export interface CatalogModel {
  /** camelCase root key used as the path prefix, e.g. `capacityDefinition`. */
  key: string;
  /** Sequelize model name, e.g. `CapacityDefinition`. */
  model: string;
  table: string;
  fields: CatalogField[];
}

export interface ModelFieldCatalog {
  organizationId: number;
  models: CatalogModel[];
}

/** How deep association chains are followed (root fields are depth 0). */
const MAX_DEPTH = 2;

/** Never expose secrets / credentials as evaluable fields. */
const SENSITIVE_FIELDS = new Set([
  'passwordHash',
  'keyHash',
  'permissionsJson',
  'proof',
  'signatureData',
  'signedDocumentHash',
  'documentHash',
  'accountNumber',
  'routingNumber',
]);

function modelKey(name: string): string {
  return name.length ? name[0].toLowerCase() + name.slice(1) : name;
}

/**
 * Resolves an org-scoped catalog model from its camelCase key (e.g. `submission`).
 * Only models carrying `organizationId` are resolvable, so the runner can never
 * be pointed at an out-of-scope table. Returns null for unknown / non-org keys.
 */
export function resolveOrgScopedModel(key: string): ModelStatic<Model> | null {
  const sequelize = getSequelize();
  for (const model of Object.values(sequelize.models) as ModelStatic<Model>[]) {
    if (modelKey(model.name) === key && isOrgScoped(model)) return model;
  }
  return null;
}

function humanize(segment: string): string {
  return segment
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

function kindOf(attr: any): CatalogFieldKind {
  const key = String(attr?.type?.key ?? '').toUpperCase();
  if (/INT|DECIMAL|FLOAT|DOUBLE|REAL|NUMERIC|BIGINT/.test(key)) return 'number';
  if (key.includes('BOOL')) return 'boolean';
  if (key.includes('JSON')) return 'json';
  if (key.includes('UUID')) return 'uuid';
  if (key.includes('DATE') || key.includes('TIME')) return 'date';
  return 'text';
}

function attributesOf(model: ModelStatic<Model>): Record<string, any> {
  const m = model as any;
  return (typeof m.getAttributes === 'function' ? m.getAttributes() : m.rawAttributes) ?? {};
}

function isOrgScoped(model: ModelStatic<Model>): boolean {
  return 'organizationId' in attributesOf(model);
}

/** Recursively collect own fields plus singular-association fields. */
function collectFields(
  model: ModelStatic<Model>,
  prefix: string,
  chain: Set<string>,
  depth: number,
  via: string | undefined,
  out: CatalogField[],
): void {
  const attrs = attributesOf(model);
  for (const [name, attr] of Object.entries(attrs)) {
    if (SENSITIVE_FIELDS.has(name)) continue;
    out.push({
      path: `${prefix}.${name}`,
      label: humanize(name),
      kind: kindOf(attr),
      nullable: (attr as any)?.allowNull !== false,
      via,
    });
  }

  if (depth >= MAX_DEPTH) return;

  const associations = (model as any).associations ?? {};
  for (const [as, assoc] of Object.entries<any>(associations)) {
    const type = assoc?.associationType;
    if (type !== 'BelongsTo' && type !== 'HasOne') continue; // singular links only
    const target: ModelStatic<Model> | undefined = assoc?.target;
    if (!target || chain.has(target.name)) continue; // guard against cycles
    collectFields(
      target,
      `${prefix}.${as}`,
      new Set([...chain, target.name]),
      depth + 1,
      via ? `${via} → ${as}` : as,
      out,
    );
  }
}

/**
 * Builds the catalog for a given organization. The field shape is the same for
 * every org (it mirrors the schema); the organizationId is echoed back so the
 * caller knows the scope every path resolves within.
 */
export function buildModelFieldCatalog(organizationId: number): ModelFieldCatalog {
  const sequelize = getSequelize();
  const models = Object.values(sequelize.models) as ModelStatic<Model>[];

  const catalog: CatalogModel[] = [];
  for (const model of models) {
    if (!isOrgScoped(model)) continue;
    const key = modelKey(model.name);
    const fields: CatalogField[] = [];
    collectFields(model, key, new Set([model.name]), 0, undefined, fields);
    catalog.push({ key, model: model.name, table: model.getTableName() as string, fields });
  }

  catalog.sort((a, b) => a.model.localeCompare(b.model));
  return { organizationId, models: catalog };
}
