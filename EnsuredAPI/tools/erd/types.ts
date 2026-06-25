/** Shared data model for the ERD extractor and viewer. */

export type RelationKind = 'belongsTo' | 'hasOne' | 'hasMany' | 'belongsToMany';

/** "1:1" | "1:N" | "N:M" — display cardinality for a relationship. */
export type Cardinality = '1:1' | '1:N' | 'N:M';

export interface ErdColumn {
  /** Model attribute name (camelCase), e.g. "organizationId". */
  name: string;
  /** Physical column name, e.g. "organization_id" (omitted when identical to name). */
  field?: string;
  /** Readable SQL-ish type, e.g. "UUID", "VARCHAR(255)", "ENUM('a','b')", "JSONB". */
  type: string;
  primaryKey: boolean;
  allowNull: boolean;
  unique: boolean;
  /** Set when this column is a foreign key: the table.column it points at. */
  references?: { table: string; column: string };
  /** Stringified default, when one is statically declared. */
  defaultValue?: string;
}

export interface ErdTable {
  /** Sequelize model name, e.g. "Organization". The stable id used in the viewer. */
  name: string;
  /** Physical table name, e.g. "organizations". */
  tableName: string;
  /** Domain grouping derived from the init function that registered the model. */
  domain: string;
  /** One-line purpose, curated in descriptions.ts (empty if none is defined). */
  description: string;
  columns: ErdColumn[];
}

export interface ErdRelationship {
  /** The table that holds the foreign key. */
  child: string;
  /** The referenced (parent) table. */
  parent: string;
  /** Foreign key attribute on the child. */
  foreignKey: string;
  /** Association alias (`as`) — most descriptive of the two reciprocal sides. */
  as: string;
  kind: RelationKind;
  cardinality: Cardinality;
  /** True when the parent side is optional (FK is nullable / self-ref). */
  optional: boolean;
}

export interface ErdStats {
  domains: number;
  tables: number;
  columns: number;
  relationships: number;
  foreignKeys: number;
}

export interface ErdSchema {
  project: string;
  generatedAt: string;
  stats: ErdStats;
  /** Domain → table names, in registration order. */
  domains: { name: string; tables: string[] }[];
  tables: ErdTable[];
  relationships: ErdRelationship[];
}
