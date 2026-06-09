import { DataTypes, QueryInterface, Transaction } from 'sequelize';

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) => (typeof value === 'string' ? value : value.tableName));
  return normalized.includes(tableName);
}

function baseColumns() {
  return {
    createdAt: { type: DataTypes.DATE, allowNull: true },
    updatedAt: { type: DataTypes.DATE, allowNull: true },
  };
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    if (!(await tableExists(context, 'pageTemplates', transaction))) {
      await context.createTable(
        'pageTemplates',
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
          status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'published' },
          schemaVersion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
          isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
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
          ...baseColumns(),
        },
        { transaction },
      );

      await context.addIndex('pageTemplates', ['scopeKey', 'pageKey', 'version', 'lineOfBusinessCode', 'lineOfBusinessSubTypeCode'], {
        unique: true,
        transaction,
        name: 'pageTemplates_scope_page_version_lob_unique',
      });
      await context.addIndex('pageTemplates', ['organizationId', 'pageKey'], {
        transaction,
        name: 'pageTemplates_organization_page_idx',
      });
      await context.addIndex('pageTemplates', ['scopeKey', 'pageKey', 'status'], {
        transaction,
        name: 'pageTemplates_scope_page_status_idx',
      });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// NOTE: default page templates are seeded at server boot via
// `ensureDefaultPageTemplates` (server.ts), which runs AFTER all migrations. The
// seed must NOT run from inside this migration: it goes through the live
// `PageTemplate` model, which has since gained columns (e.g. `source`, added by
// 20260607000000-add-page-template-source) that do not exist at this migration's
// point in the sequence — seeding here fails a fresh migrate with
// `column "source" does not exist`.

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    if (await tableExists(context, 'pageTemplates', transaction)) {
      await context.dropTable('pageTemplates', { transaction });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
