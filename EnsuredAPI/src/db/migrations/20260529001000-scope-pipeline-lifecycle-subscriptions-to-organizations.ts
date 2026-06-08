import { DataTypes, QueryInterface, Transaction } from 'sequelize';

const tableName = 'pipelineLifecycleSubscriptions';

async function tableExists(context: QueryInterface, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = (tableNames as Array<string | { tableName: string }>).map((value) => (
    typeof value === 'string' ? value : value.tableName
  ));
  return normalized.includes(tableName);
}

async function columnExists(context: QueryInterface, columnName: string, transaction: Transaction): Promise<boolean> {
  const description = await context.describeTable(tableName, { transaction } as any);
  return Object.prototype.hasOwnProperty.call(description, columnName);
}

async function indexExists(context: QueryInterface, indexName: string, transaction: Transaction): Promise<boolean> {
  const [rows] = await context.sequelize.query(
    'select 1 from pg_indexes where schemaname = current_schema() and indexname = :indexName limit 1',
    { replacements: { indexName }, transaction },
  );
  return Array.isArray(rows) && rows.length > 0;
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    if (!(await tableExists(context, transaction))) {
      await transaction.commit();
      return;
    }

    if (await columnExists(context, 'userId', transaction)) {
      await context.sequelize.query(
        `update "${tableName}" subscriptions
         set "organizationId" = users."organizationId"
         from "users"
         where subscriptions."userId" = users."id"
           and subscriptions."organizationId" is null`,
        { transaction },
      );

      if (await indexExists(context, 'uq_pipeline_lifecycle_subscriptions_user_event', transaction)) {
        await context.removeIndex(tableName, 'uq_pipeline_lifecycle_subscriptions_user_event', { transaction });
      }

      await context.removeColumn(tableName, 'userId', { transaction });
    }

    await context.sequelize.query(
      `delete from "${tableName}" where "organizationId" is null`,
      { transaction },
    );

    await context.changeColumn(
      tableName,
      'organizationId',
      {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'organizations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      { transaction },
    );

    if (!(await indexExists(context, 'uq_pipeline_lifecycle_subscriptions_org_event', transaction))) {
      await context.addIndex(tableName, ['organizationId', 'eventKey'], {
        unique: true,
        name: 'uq_pipeline_lifecycle_subscriptions_org_event',
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
    if (await tableExists(context, transaction) && await indexExists(context, 'uq_pipeline_lifecycle_subscriptions_org_event', transaction)) {
      await context.removeIndex(tableName, 'uq_pipeline_lifecycle_subscriptions_org_event', { transaction });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
