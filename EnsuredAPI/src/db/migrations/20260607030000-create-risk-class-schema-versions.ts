import { DataTypes, QueryInterface, Transaction } from 'sequelize';

/**
 * Slice 1 of the Risk Class Registry — org-editable dynamic schema.
 *
 * This migration is strictly ADDITIVE and backward-compatible:
 *   - NEW TABLE `risk_class_schema_versions` (immutable, content-addressed
 *     compiled schema artifact that submissions pin to).
 *   - ALTER `canonical_submissions` — three NEW NULLABLE columns
 *     (`schema_version_id`, `line_of_business_code`,
 *     `line_of_business_sub_type_code`).
 *
 * No existing column is dropped, renamed, or made non-nullable. Every existing
 * `canonical_submissions` row keeps `schema_version_id = NULL` ⇒ identical legacy
 * (freeform, unenforced) behavior.
 */

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) => (typeof value === 'string' ? value : (value as { tableName: string }).tableName));
  return normalized.includes(tableName);
}

async function columnExists(
  context: QueryInterface,
  tableName: string,
  columnName: string,
  transaction: Transaction,
): Promise<boolean> {
  const description = await context.describeTable(tableName, { transaction });
  return Object.prototype.hasOwnProperty.call(description, columnName);
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    if (!(await tableExists(context, 'risk_class_schema_versions', transaction))) {
      await context.createTable(
        'risk_class_schema_versions',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
          organizationId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'organizations', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          lineOfBusinessCode: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
          lineOfBusinessSubTypeCode: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
          pageKey: { type: DataTypes.STRING, allowNull: false },
          sourceTemplateId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'pageTemplates', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          schemaVersion: { type: DataTypes.INTEGER, allowNull: false },
          status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'published' },
          baseSchemaVersionId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'risk_class_schema_versions', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          definitionJson: { type: DataTypes.JSONB, allowNull: false },
          compiledJsonSchema: { type: DataTypes.JSONB, allowNull: false },
          contentHash: { type: DataTypes.STRING, allowNull: false },
          publishedByUserId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          publishedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
          createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
          updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        { transaction },
      );

      await context.addIndex(
        'risk_class_schema_versions',
        ['organizationId', 'lineOfBusinessCode', 'lineOfBusinessSubTypeCode', 'pageKey', 'schemaVersion'],
        {
          unique: true,
          transaction,
          name: 'risk_class_schema_versions_scope_version_unique',
        },
      );
      await context.addIndex('risk_class_schema_versions', ['organizationId', 'contentHash'], {
        unique: true,
        transaction,
        name: 'risk_class_schema_versions_content_hash_unique',
      });
      await context.addIndex(
        'risk_class_schema_versions',
        ['organizationId', 'lineOfBusinessCode', 'lineOfBusinessSubTypeCode', 'pageKey', 'status'],
        {
          transaction,
          name: 'risk_class_schema_versions_scope_status_idx',
        },
      );
    }

    if (await tableExists(context, 'canonical_submissions', transaction)) {
      if (!(await columnExists(context, 'canonical_submissions', 'schema_version_id', transaction))) {
        await context.addColumn(
          'canonical_submissions',
          'schema_version_id',
          {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'risk_class_schema_versions', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          { transaction },
        );
      }

      if (!(await columnExists(context, 'canonical_submissions', 'line_of_business_code', transaction))) {
        await context.addColumn(
          'canonical_submissions',
          'line_of_business_code',
          { type: DataTypes.STRING, allowNull: true },
          { transaction },
        );
      }

      if (!(await columnExists(context, 'canonical_submissions', 'line_of_business_sub_type_code', transaction))) {
        await context.addColumn(
          'canonical_submissions',
          'line_of_business_sub_type_code',
          { type: DataTypes.STRING, allowNull: true },
          { transaction },
        );
      }
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    if (await tableExists(context, 'canonical_submissions', transaction)) {
      if (await columnExists(context, 'canonical_submissions', 'schema_version_id', transaction)) {
        await context.removeColumn('canonical_submissions', 'schema_version_id', { transaction });
      }
      if (await columnExists(context, 'canonical_submissions', 'line_of_business_code', transaction)) {
        await context.removeColumn('canonical_submissions', 'line_of_business_code', { transaction });
      }
      if (await columnExists(context, 'canonical_submissions', 'line_of_business_sub_type_code', transaction)) {
        await context.removeColumn('canonical_submissions', 'line_of_business_sub_type_code', { transaction });
      }
    }

    if (await tableExists(context, 'risk_class_schema_versions', transaction)) {
      await context.dropTable('risk_class_schema_versions', { transaction });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
