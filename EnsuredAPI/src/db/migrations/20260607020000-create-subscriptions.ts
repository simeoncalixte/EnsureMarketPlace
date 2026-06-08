import { DataTypes, QueryInterface } from 'sequelize';

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  // Wrapped in a transaction so the table + indexes apply atomically — a partial
  // failure rolls back cleanly so the migration can be retried.
  await context.sequelize.transaction(async (transaction) => {
    await context.createTable(
      'subscriptions',
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        organizationId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'organizations', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        planCode: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        role: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        billingInterval: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        amountCents: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        currency: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'usd',
        },
        status: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        provider: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        stripeCustomerId: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        stripeSubscriptionId: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        currentPeriodEnd: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      { transaction },
    );

    await context.addIndex('subscriptions', ['userId'], {
      name: 'subscriptions_user_id_idx',
      transaction,
    });
    await context.addIndex('subscriptions', ['stripeSubscriptionId'], {
      name: 'subscriptions_stripe_subscription_id_idx',
      transaction,
    });
  });
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  await context.dropTable('subscriptions');
}
