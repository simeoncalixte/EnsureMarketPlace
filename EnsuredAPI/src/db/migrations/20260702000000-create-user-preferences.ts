import { DataTypes, QueryInterface, Transaction } from 'sequelize';

/**
 * Per-user UI preferences — a lean (user_id, key) -> JSON value store so personal
 * choices (map submission-type colors, etc.) sync across devices. One row per
 * (user_id, key). Follows the project convention of snapshotting existence BEFORE
 * any DDL to avoid the describeTable-after-DDL deadlock.
 */

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) => (typeof value === 'string' ? value : value.tableName));
  return normalized.includes(tableName);
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    const exists = await tableExists(context, 'user_preferences', transaction);

    if (!exists) {
      await context.createTable(
        'user_preferences',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
          user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          key: { type: DataTypes.STRING, allowNull: false },
          value: { type: DataTypes.JSONB, allowNull: true },
          created_at: { type: DataTypes.DATE, allowNull: true },
          updated_at: { type: DataTypes.DATE, allowNull: true },
        },
        { transaction },
      );

      await context.addIndex('user_preferences', ['user_id', 'key'], {
        unique: true,
        name: 'uq_user_preferences_user_key',
        transaction,
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
    const exists = await tableExists(context, 'user_preferences', transaction);
    if (exists) {
      await context.dropTable('user_preferences', { transaction });
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
