import { DataTypes, QueryInterface, Transaction } from 'sequelize';

/**
 * Lazy-loaded selection-option storage for generated forms. Two new tables, no
 * existing table touched — strictly ADDITIVE. The schema-generation stage writes
 * a `schema_option_sets` header (keyed by organization + option_set_key) and one
 * `schema_option_set_items` row per {value,label} pair; form fields reference a
 * set via `optionSetKey` and the UI fetches its items on demand. Idempotent
 * guards mirror the existing migrations. Columns are snake_case (underscored
 * models).
 */

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) =>
    typeof value === 'string' ? value : (value as { tableName: string }).tableName,
  );
  return normalized.includes(tableName);
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    if (!(await tableExists(context, 'schema_option_sets', transaction))) {
      await context.createTable(
        'schema_option_sets',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
          organization_id: { type: DataTypes.INTEGER, allowNull: true },
          option_set_key: { type: DataTypes.STRING, allowNull: false },
          label: { type: DataTypes.STRING, allowNull: true },
          line_of_business_code: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
          line_of_business_sub_type_code: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
          field_key: { type: DataTypes.STRING, allowNull: true },
          source: { type: DataTypes.STRING, allowNull: false, defaultValue: 'ai' },
          created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
          updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        { transaction },
      );
      await context.addIndex('schema_option_sets', ['organization_id', 'option_set_key'], {
        transaction,
        unique: true,
        name: 'schema_option_sets_org_key_uniq',
      });
    }

    if (!(await tableExists(context, 'schema_option_set_items', transaction))) {
      await context.createTable(
        'schema_option_set_items',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
          option_set_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'schema_option_sets', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          value: { type: DataTypes.STRING, allowNull: false },
          label: { type: DataTypes.STRING, allowNull: false },
          order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
          created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
          updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        { transaction },
      );
      await context.addIndex('schema_option_set_items', ['option_set_id'], {
        transaction,
        name: 'schema_option_set_items_set_idx',
      });
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
    if (await tableExists(context, 'schema_option_set_items', transaction)) {
      await context.dropTable('schema_option_set_items', { transaction });
    }
    if (await tableExists(context, 'schema_option_sets', transaction)) {
      await context.dropTable('schema_option_sets', { transaction });
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
