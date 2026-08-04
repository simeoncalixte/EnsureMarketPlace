import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export type PageTemplateFieldType = 'text' | 'textarea' | 'number' | 'integer' | 'select' | 'boolean' | 'radio' | 'date';

export type PageTemplateOption = {
  label: string;
  value: string;
};

export type PageTemplateFieldVisibility = {
  lineOfBusinessCodes?: string[];
  lineOfBusinessSubTypeCodes?: string[];
};

export type PageTemplateSectionLayoutDefinition = {
  type?: 'grid';
  columns?: number;
  gap?: number;
  dense?: boolean;
  columnWidths?: number[];
  rowHeights?: number[];
};

export type PageTemplateFieldLayoutDefinition = {
  columnStart?: number;
  columnSpan?: number;
  rowStart?: number;
  rowSpan?: number;
};

/**
 * Additive, governance-grade constraint metadata for a field. Purely optional —
 * old templates omit these keys and behave exactly as before. On publish, these
 * map to JSON Schema (`minimum`, `maximum`, `minLength`, `pattern`, `enum`, …)
 * via `compileToJsonSchema`.
 */
export type PageTemplateFieldConstraints = {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enumValues?: string[];
  unit?: string;
  nullable?: boolean;
};

export type PageTemplateFieldDefinition = {
  key: string;
  label: string;
  type: PageTemplateFieldType;
  order: number;
  required?: boolean;
  defaultValue?: string | number | boolean | null;
  options?: PageTemplateOption[];
  /**
   * Reference to a lazy-loaded SchemaOptionSet (by `optionSetKey`) instead of
   * inlining `options`. Set by the schema-generation stage when it extracts a
   * choice field's options into the `schema_option_sets` table; the UI fetches the
   * {value,label} items on demand. Mutually exclusive with `options` in practice —
   * a generated field carries one or the other.
   */
  optionSetKey?: string;
  canonicalKey?: string;
  placeholder?: string;
  helperText?: string;
  dataSource?: string;
  dependsOn?: string;
  /**
   * Provenance of an individual field: `'base'` = canonical scaffold (protected —
   * never user-removable), `'ai'` = generated/suggested for this submission (a user
   * may prune it in the submission view). Omitted on legacy/builder-authored fields,
   * which are treated as non-removable in the submission view. See the unified
   * `removeTemplateField` guard and the `DynamicField` `×` control.
   */
  origin?: 'base' | 'ai';
  visibleWhen?: PageTemplateFieldVisibility;
  layout?: PageTemplateFieldLayoutDefinition;
  // --- Additive Slice-1 schema-governance keys (all optional) ---
  constraints?: PageTemplateFieldConstraints;
  feedsModeling?: boolean;
  requiredForMethods?: string[];
};

export type PageTemplateSectionDefinition = {
  key: string;
  label: string;
  order: number;
  description?: string;
  fields: PageTemplateFieldDefinition[];
  layout?: PageTemplateSectionLayoutDefinition;
  // --- Additive repeatable-section keys (all optional) ---
  /**
   * When true the section is a schedule: it captures one *row* per item and the
   * UI renders it as a repeatable card list ("add another"). Old templates omit
   * this and behave exactly as before (a single, flat instance). On publish, a
   * repeatable section compiles to a JSON-Schema `array` under `collectionKey`
   * whose `items` carry this section's fields — instead of hoisting those fields
   * to the top level. See `compileToJsonSchema`.
   */
  repeatable?: boolean;
  /** Canonical key the array of rows is stored under (e.g. `statementOfValues`). Defaults to a camelCase of `key`. */
  collectionKey?: string;
  /** Minimum number of rows required when the section is repeatable. */
  minItems?: number;
  /** Maximum number of rows allowed when the section is repeatable. */
  maxItems?: number;
  /** Singular noun for one row, used by the UI for the add button / card title (e.g. `Value Item`). */
  itemLabel?: string;
};

export type PageTemplateDefinition = {
  schemaVersion: number;
  pageKey: string;
  title: string;
  description?: string;
  sections: PageTemplateSectionDefinition[];
};

export const pageTemplateStatuses = ['draft', 'published', 'archived'] as const;

/**
 * Provenance of a template's definition: authored by a human in the builder UI,
 * or produced/extended by the schema-generation LLM stage. AI-sourced templates
 * are still LOB-keyed and reusable; the flag lets the UI surface their origin and
 * lets a human take over editing without losing where the structure came from.
 */
export const pageTemplateSources = ['human', 'ai'] as const;

export class PageTemplate extends Model<InferAttributes<PageTemplate>, InferCreationAttributes<PageTemplate>> {
  declare id: CreationOptional<number>;
  declare organizationId: number | null;
  declare scopeKey: string;
  declare pageKey: string;
  declare version: number;
  declare status: (typeof pageTemplateStatuses)[number];
  declare schemaVersion: number;
  declare isDefault: boolean;
  declare source: CreationOptional<(typeof pageTemplateSources)[number]>;
  declare lineOfBusinessCode: string;
  declare lineOfBusinessSubTypeCode: string;
  declare parentTemplateId: number | null;
  declare createdByUserId: number | null;
  declare publishedAt: Date | null;
  declare definitionJson: PageTemplateDefinition;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initPageTemplateModels(sequelize: Sequelize): void {
  PageTemplate.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      organizationId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'organizations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      scopeKey: { type: DataTypes.STRING, allowNull: false, defaultValue: 'global' },
      pageKey: { type: DataTypes.STRING, allowNull: false },
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'published',
        validate: { isIn: [pageTemplateStatuses] },
      },
      schemaVersion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      source: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'human',
        validate: { isIn: [pageTemplateSources] },
      },
      lineOfBusinessCode: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
      lineOfBusinessSubTypeCode: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
      parentTemplateId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'pageTemplates', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdByUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      publishedAt: { type: DataTypes.DATE, allowNull: true },
      definitionJson: { type: DataTypes.JSONB, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'PageTemplate',
      tableName: 'pageTemplates',
      indexes: [
        { unique: true, fields: ['scopeKey', 'pageKey', 'version', 'lineOfBusinessCode', 'lineOfBusinessSubTypeCode'] },
        { fields: ['organizationId', 'pageKey'] },
        { fields: ['scopeKey', 'pageKey', 'status'] },
      ],
    },
  );
}