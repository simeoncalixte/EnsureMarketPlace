import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export const subscriptionStatuses = ['active', 'trialing', 'incomplete', 'past_due', 'canceled'] as const;
export const billingIntervals = ['monthly', 'annual'] as const;
export const subscriptionProviders = ['stripe', 'simulated'] as const;

// One row per user subscription captured at registration. The Stripe identifiers
// link back to the live billing objects; `provider` records whether the charge
// went through the real Stripe API or the deterministic simulated fallback.
export class Subscription extends Model<
  InferAttributes<Subscription>,
  InferCreationAttributes<Subscription>
> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare organizationId: number | null;
  declare planCode: string;
  declare role: string;
  declare billingInterval: (typeof billingIntervals)[number];
  declare amountCents: number;
  declare currency: string;
  declare status: (typeof subscriptionStatuses)[number];
  declare provider: (typeof subscriptionProviders)[number];
  declare stripeCustomerId: string | null;
  declare stripeSubscriptionId: string | null;
  declare currentPeriodEnd: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initBillingModels(sequelize: Sequelize): void {
  Subscription.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      organizationId: { type: DataTypes.INTEGER, allowNull: true },
      planCode: { type: DataTypes.STRING, allowNull: false },
      role: { type: DataTypes.STRING, allowNull: false },
      billingInterval: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isIn: [billingIntervals as unknown as string[]] },
      },
      amountCents: { type: DataTypes.INTEGER, allowNull: false },
      currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'usd' },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isIn: [subscriptionStatuses as unknown as string[]] },
      },
      provider: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isIn: [subscriptionProviders as unknown as string[]] },
      },
      stripeCustomerId: { type: DataTypes.STRING, allowNull: true },
      stripeSubscriptionId: { type: DataTypes.STRING, allowNull: true },
      currentPeriodEnd: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'Subscription', tableName: 'subscriptions', underscored: false },
  );
}
