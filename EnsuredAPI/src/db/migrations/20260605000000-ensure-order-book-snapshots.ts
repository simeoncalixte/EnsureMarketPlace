import { DataTypes, QueryInterface, Transaction } from 'sequelize';

// Repairs local databases where `orderBookSnapshots` was added to the base
// platform-schema migration after that migration had already been applied, so
// the table was never created (the migration won't re-run). Idempotent: it
// only creates the table when it is missing.

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) => (typeof value === 'string' ? value : value.tableName));
  return normalized.includes(tableName);
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    if (!(await tableExists(context, 'orderBookSnapshots', transaction))) {
      await context.createTable(
        'orderBookSnapshots',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
          tokenId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'tokens', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          bids: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
          asks: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
          capturedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
          createdAt: { type: DataTypes.DATE, allowNull: true },
          updatedAt: { type: DataTypes.DATE, allowNull: true },
        },
        { transaction },
      );

      await context.addIndex('orderBookSnapshots', ['tokenId'], {
        name: 'idx_order_book_snapshots_token',
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
  // No-op: the table is owned by the base platform-schema migration; this
  // migration only backfills it when missing and should not drop it.
}
