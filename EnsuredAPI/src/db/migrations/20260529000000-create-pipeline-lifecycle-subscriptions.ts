import { DataTypes, QueryInterface, Transaction } from 'sequelize';

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = (tableNames as Array<string | { tableName: string }>).map((value) => (
    typeof value === 'string' ? value : value.tableName
  ));
  return normalized.includes(tableName);
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    if (!(await tableExists(context, 'pipelineLifecycleSubscriptions', transaction))) {
      await context.createTable(
        'pipelineLifecycleSubscriptions',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
          organizationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'organizations', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          eventKey: { type: DataTypes.STRING, allowNull: false },
          process: { type: DataTypes.STRING, allowNull: false },
          stage: { type: DataTypes.STRING, allowNull: false },
          enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
          createdAt: { type: DataTypes.DATE, allowNull: true },
          updatedAt: { type: DataTypes.DATE, allowNull: true },
        },
        { transaction },
      );

      await context.addIndex('pipelineLifecycleSubscriptions', ['organizationId', 'eventKey'], {
        unique: true,
        name: 'uq_pipeline_lifecycle_subscriptions_org_event',
        transaction,
      });
      await context.addIndex('pipelineLifecycleSubscriptions', ['organizationId'], {
        name: 'idx_pipeline_lifecycle_subscriptions_org',
        transaction,
      });
      await context.addIndex('pipelineLifecycleSubscriptions', ['eventKey'], {
        name: 'idx_pipeline_lifecycle_subscriptions_event',
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
    if (await tableExists(context, 'pipelineLifecycleSubscriptions', transaction)) {
      await context.dropTable('pipelineLifecycleSubscriptions', { transaction });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
