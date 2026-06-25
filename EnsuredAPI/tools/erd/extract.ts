/**
 * ERD extractor. Initializes the Sequelize models in-memory (no database
 * connection is opened — `.init()` and association wiring are pure metadata
 * operations) and reads each model's `rawAttributes` and `associations` to
 * produce a database-accurate entity-relationship schema.
 *
 * Domains are attributed by replaying the per-domain `init*Models` functions on
 * a throwaway Sequelize and diffing the registered model names after each call,
 * so the grouping always matches the real module boundaries.
 */
import { Sequelize, Model, ModelStatic } from 'sequelize';
import {
  Cardinality,
  ErdColumn,
  ErdRelationship,
  ErdSchema,
  ErdTable,
  RelationKind,
} from './types';

import { TABLE_DESCRIPTIONS } from './descriptions';
import { initModels } from '../../src/db/models';
import { initIdentityModels } from '../../src/db/models/identity.models';
import { initPageTemplateModels } from '../../src/db/models/pageTemplates.models';
import { initRiskClassSchemaModels } from '../../src/db/models/riskClassSchema.models';
import { initRiskClassRegistryModels } from '../../src/db/models/riskClassRegistry.models';
import { initBenchmarkPriorModels } from '../../src/db/models/benchmarkPrior.models';
import { initLineOfBusinessModels } from '../../src/db/models/lineOfBusiness.models';
import { initUnderwritingModels } from '../../src/db/models/underwriting.models';
import { initIngestionModels } from '../../src/db/models/ingestion.models';
import { initPipelineConfigModels } from '../../src/db/models/pipelineConfig.models';
import { initAppetiteModels } from '../../src/db/models/appetite.models';
import { initPipelineModels } from '../../src/db/models/pipeline.models';
import { initCapitalModels } from '../../src/db/models/capital.models';
import { initGovernanceModels } from '../../src/db/models/governance.models';
import { initComplianceModels } from '../../src/db/models/compliance.models';
import { initCrestaModels } from '../../src/db/models/cresta.models';
import { initGeographyModels } from '../../src/db/models/geography.models';
import { initBillingModels } from '../../src/db/models/billing.models';
import { initSocialModels } from '../../src/db/models/social.models';
import { initSignatureModels } from '../../src/db/models/signature.models';
import { initSchemaOptionSetModels } from '../../src/db/models/schemaOptionSets.models';

type InitFn = (sequelize: Sequelize) => void;

/** Domain label → init function, in the same order initModels() applies them. */
const DOMAIN_INITS: ReadonlyArray<readonly [string, InitFn]> = [
  ['Identity', initIdentityModels],
  ['Page Templates', initPageTemplateModels],
  ['Risk Class Schema', initRiskClassSchemaModels],
  ['Risk Class Registry', initRiskClassRegistryModels],
  ['Benchmark Priors', initBenchmarkPriorModels],
  ['Line of Business', initLineOfBusinessModels],
  ['Underwriting', initUnderwritingModels],
  ['Ingestion', initIngestionModels],
  ['Pipeline Config', initPipelineConfigModels],
  ['Appetite', initAppetiteModels],
  ['Pipeline', initPipelineModels],
  ['Capital', initCapitalModels],
  ['Governance', initGovernanceModels],
  ['Compliance', initComplianceModels],
  ['CRESTA', initCrestaModels],
  ['Geography', initGeographyModels],
  ['Billing', initBillingModels],
  ['Social', initSocialModels],
  ['Signature', initSignatureModels],
  ['Schema Option Sets', initSchemaOptionSetModels],
];

/**
 * Curated domain taxonomy for the diagram. Init functions group models by file,
 * which leaves one oversized domain (Capital, 17 tables) and several singletons.
 * These overrides regroup tables into balanced, reader-friendly domains without
 * moving any model files. A model not listed here keeps its init-derived domain.
 */
const DOMAIN_OVERRIDES: Record<string, string> = {
  // Capital (17) splits into three coherent concerns.
  SPV: 'Capital Structure',
  SPVEntity: 'Capital Structure',
  SPVOwnership: 'Capital Structure',
  CollateralAccount: 'Capital Structure',
  CollateralMovement: 'Capital Structure',
  Token: 'Tokenization',
  TokenHolder: 'Tokenization',
  TokenLock: 'Tokenization',
  TokenTransaction: 'Tokenization',
  Tranche: 'Tokenization',
  TrancheSubscription: 'Tokenization',
  Order: 'Trading',
  OrderBookSnapshot: 'Trading',
  Trade: 'Trading',
  Fee: 'Trading',
  Deal: 'Trading',
  CapitalCommitment: 'Trading',
  // The form/schema-definition machinery (4 small domains) folds into one.
  PageTemplate: 'Schema & Templates',
  RiskClassSchemaVersion: 'Schema & Templates',
  RiskClassRegistry: 'Schema & Templates',
  SchemaOptionSet: 'Schema & Templates',
  SchemaOptionSetItem: 'Schema & Templates',
  // Billing (singleton) is a user/org-scoped concern; fold into Identity.
  Subscription: 'Identity',
};

/** Display order for the curated taxonomy; unlisted domains follow in init order. */
const DOMAIN_DISPLAY_ORDER: string[] = [
  'Identity',
  'Line of Business',
  'Schema & Templates',
  'Benchmark Priors',
  'Underwriting',
  'Ingestion',
  'Pipeline Config',
  'Pipeline',
  'Appetite',
  'Capital Structure',
  'Tokenization',
  'Trading',
  'Governance',
  'Compliance',
  'CRESTA',
  'Geography',
  'Social',
  'Signature',
];

function newOfflineSequelize(): Sequelize {
  // Dialect-only construction never opens a socket; we never call authenticate().
  return new Sequelize({ dialect: 'postgres', logging: false });
}

/** Attributes each model to a domain by diffing model registration per init fn. */
function buildDomainMap(): { order: string[]; byModel: Map<string, string> } {
  const sequelize = newOfflineSequelize();
  const byModel = new Map<string, string>();
  const order: string[] = [];
  let seen = new Set<string>(Object.keys(sequelize.models));
  for (const [domain, init] of DOMAIN_INITS) {
    init(sequelize);
    const now = Object.keys(sequelize.models);
    for (const name of now) {
      if (!seen.has(name)) byModel.set(name, domain);
    }
    if (!order.includes(domain)) order.push(domain);
    seen = new Set(now);
  }
  return { order, byModel };
}

/** Best-effort readable SQL type, resilient to dialect-specific stringifiers. */
function typeOf(attribute: { type: unknown }): string {
  const type = attribute.type as
    | { key?: string; values?: string[]; toSql?: () => string; constructor?: { key?: string } }
    | undefined;
  if (!type) return 'unknown';
  if (Array.isArray(type.values) && type.values.length) {
    return `ENUM(${type.values.map((value) => `'${value}'`).join(', ')})`;
  }
  try {
    if (typeof type.toSql === 'function') return type.toSql();
    return String(type);
  } catch {
    return type.key ?? type.constructor?.key ?? 'unknown';
  }
}

/** Only surface statically meaningful primitive defaults; skip fns / generators. */
function defaultOf(value: unknown): string | undefined {
  if (value == null) return undefined;
  const kind = typeof value;
  if (kind === 'string' || kind === 'number' || kind === 'boolean') return String(value);
  return undefined;
}

function relationKind(associationType: string): RelationKind {
  switch (associationType) {
    case 'BelongsTo':
      return 'belongsTo';
    case 'HasOne':
      return 'hasOne';
    case 'HasMany':
      return 'hasMany';
    default:
      return 'belongsToMany';
  }
}

export function extractSchema(projectName: string): ErdSchema {
  const { order: domainOrder, byModel } = buildDomainMap();

  // Real pass: initModels wires every association. Re-initialises the same model
  // classes onto this Sequelize (last init wins), then defines associations.
  const sequelize = newOfflineSequelize();
  initModels(sequelize);
  const models = sequelize.models as Record<string, ModelStatic<Model>>;

  // --- relationships (deduped by child + fk + parent) -----------------------
  interface MutableRel {
    child: string;
    parent: string;
    foreignKey: string;
    as: string;
    kinds: Set<RelationKind>;
  }
  const rels = new Map<string, MutableRel>();
  const fkColumnsByTable = new Map<string, Set<string>>();

  for (const model of Object.values(models)) {
    for (const association of Object.values(model.associations)) {
      const kind = relationKind(association.associationType);
      const target = association.target as ModelStatic<Model>;
      const foreignKey = String(association.foreignKey);
      // Normalise to (child = FK holder, parent = referenced table).
      const child = kind === 'belongsTo' ? model.name : target.name;
      const parent = kind === 'belongsTo' ? target.name : model.name;
      const as = (association as { as?: string }).as ?? '';
      const key = `${child}|${foreignKey}|${parent}`;
      let rel = rels.get(key);
      if (!rel) {
        rel = { child, parent, foreignKey, as, kinds: new Set() };
        rels.set(key, rel);
      }
      rel.kinds.add(kind);
      // Prefer the belongsTo alias (names the FK from the child's side).
      if (kind === 'belongsTo' && as) rel.as = as;
      else if (!rel.as && as) rel.as = as;

      const fkSet = fkColumnsByTable.get(child) ?? new Set<string>();
      fkSet.add(foreignKey);
      fkColumnsByTable.set(child, fkSet);
    }
  }

  const cardinalityOf = (kinds: Set<RelationKind>): Cardinality => {
    if (kinds.has('belongsToMany')) return 'N:M';
    if (kinds.has('hasOne')) return '1:1';
    return '1:N';
  };

  // --- tables / columns -----------------------------------------------------
  const tables: ErdTable[] = [];
  for (const model of Object.values(models)) {
    const tableName = typeof model.tableName === 'string' ? model.tableName : model.name;
    const pkName = (model as { primaryKeyAttribute?: string }).primaryKeyAttribute;
    const fkSet = fkColumnsByTable.get(model.name) ?? new Set<string>();
    const raw = model.getAttributes() as Record<string, Record<string, unknown>>;

    const columns: ErdColumn[] = Object.entries(raw).map(([name, attribute]) => {
      const primaryKey = attribute.primaryKey === true;
      const field = typeof attribute.field === 'string' ? attribute.field : undefined;
      const column: ErdColumn = {
        name,
        type: typeOf(attribute as { type: unknown }),
        primaryKey,
        allowNull: attribute.allowNull !== false && !primaryKey,
        unique: Boolean(attribute.unique),
      };
      if (field && field !== name) column.field = field;
      const def = defaultOf(attribute.defaultValue);
      if (def !== undefined) column.defaultValue = def;
      if (fkSet.has(name)) {
        const rel = [...rels.values()].find((r) => r.child === model.name && r.foreignKey === name);
        if (rel) {
          const parentModel = models[rel.parent];
          const parentPk = (parentModel as { primaryKeyAttribute?: string } | undefined)
            ?.primaryKeyAttribute;
          column.references = { table: rel.parent, column: parentPk ?? 'id' };
        }
      }
      return column;
    });

    // Primary keys first, then declared order.
    columns.sort((a, b) => Number(b.primaryKey) - Number(a.primaryKey));

    tables.push({
      name: model.name,
      tableName,
      domain: DOMAIN_OVERRIDES[model.name] ?? byModel.get(model.name) ?? 'Other',
      description: TABLE_DESCRIPTIONS[model.name] ?? '',
      columns,
    });
    void pkName;
  }
  tables.sort((a, b) => a.name.localeCompare(b.name));

  // Surface any model missing a curated description so descriptions.ts stays complete.
  const undocumented = tables.filter((t) => !t.description).map((t) => t.name);
  if (undocumented.length) {
    process.stderr.write(
      `erd: ${undocumented.length} table(s) missing a description in tools/erd/descriptions.ts: ${undocumented.join(', ')}\n`,
    );
  }

  const relationships: ErdRelationship[] = [...rels.values()]
    .map((rel) => {
      const childModel = models[rel.child];
      const attr = childModel
        ? (childModel.getAttributes() as Record<string, { allowNull?: boolean }>)[rel.foreignKey]
        : undefined;
      const optional = rel.child === rel.parent || attr?.allowNull !== false;
      return {
        child: rel.child,
        parent: rel.parent,
        foreignKey: rel.foreignKey,
        as: rel.as,
        kind: rel.kinds.has('belongsTo') ? ('belongsTo' as RelationKind) : [...rel.kinds][0],
        cardinality: cardinalityOf(rel.kinds),
        optional,
      };
    })
    .sort((a, b) => a.parent.localeCompare(b.parent) || a.child.localeCompare(b.child));

  // --- domains (only those that actually own tables, in init order) ---------
  const tablesByDomain = new Map<string, string[]>();
  for (const table of tables) {
    const list = tablesByDomain.get(table.domain) ?? [];
    list.push(table.name);
    tablesByDomain.set(table.domain, list);
  }
  // Curated order first, then any domain present but unlisted (in init order), then Other.
  const ordered: string[] = [
    ...DOMAIN_DISPLAY_ORDER,
    ...domainOrder.filter((name) => !DOMAIN_DISPLAY_ORDER.includes(name)),
  ];
  const domains = ordered
    .filter((name) => name !== 'Other' && tablesByDomain.has(name))
    .map((name) => ({ name, tables: (tablesByDomain.get(name) ?? []).sort() }));
  if (tablesByDomain.has('Other')) {
    domains.push({ name: 'Other', tables: (tablesByDomain.get('Other') ?? []).sort() });
  }

  const totalColumns = tables.reduce((sum, table) => sum + table.columns.length, 0);
  const totalFks = [...fkColumnsByTable.values()].reduce((sum, set) => sum + set.size, 0);

  return {
    project: projectName,
    generatedAt: new Date().toISOString(),
    stats: {
      domains: domains.length,
      tables: tables.length,
      columns: totalColumns,
      relationships: relationships.length,
      foreignKeys: totalFks,
    },
    domains,
    tables,
    relationships,
  };
}
