import { DataTypes, QueryInterface, Transaction } from 'sequelize';

/**
 * Configurable Home dashboards — the `dashboard_layouts` table holding the org-
 * and user-tier layout overrides. Platform defaults stay in code; only overrides
 * are persisted. A row is keyed uniquely by (surface_key, scope, organization_id,
 * user_id), so each surface has at most one org row and one row per user.
 *
 * Follows the project convention of guarding DDL behind existence checks computed
 * BEFORE any schema change, to avoid the describeTable-after-DDL deadlock.
 */

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) => (typeof value === 'string' ? value : value.tableName));
  return normalized.includes(tableName);
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    // Snapshot existence once, before any DDL, then branch on it.
    const exists = await tableExists(context, 'dashboard_layouts', transaction);

    if (!exists) {
      await context.createTable(
        'dashboard_layouts',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
          surface_key: { type: DataTypes.STRING, allowNull: false },
          scope: { type: DataTypes.STRING, allowNull: false },
          organization_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'organizations', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          layout: { type: DataTypes.JSONB, allowNull: false },
          created_at: { type: DataTypes.DATE, allowNull: true },
          updated_at: { type: DataTypes.DATE, allowNull: true },
        },
        { transaction },
      );

      await context.addIndex('dashboard_layouts', ['surface_key', 'scope', 'organization_id', 'user_id'], {
        unique: true,
        name: 'uq_dashboard_layouts_scope',
        transaction,
      });
      await context.addIndex('dashboard_layouts', ['organization_id'], {
        name: 'idx_dashboard_layouts_org',
        transaction,
      });
      await context.addIndex('dashboard_layouts', ['user_id'], {
        name: 'idx_dashboard_layouts_user',
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
    const exists = await tableExists(context, 'dashboard_layouts', transaction);
    if (exists) {
      await context.dropTable('dashboard_layouts', { transaction });
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
