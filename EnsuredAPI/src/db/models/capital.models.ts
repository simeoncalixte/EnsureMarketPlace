import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';
import {
  collateralMovementTypes,
  dealStatuses,
  feeTypes,
  orderStatuses,
  orderTypes,
  spvStatuses,
  tokenTransactionTypes,
} from './constants';

export class SPVEntity extends Model<InferAttributes<SPVEntity>, InferCreationAttributes<SPVEntity>> {
  declare id: CreationOptional<number>;
  declare legalName: string;
  declare registrationNumber: string;
  declare regulator: string | null;
  declare domicile: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class SPV extends Model<InferAttributes<SPV>, InferCreationAttributes<SPV>> {
  declare id: CreationOptional<number>;
  declare spvEntityId: number;
  declare name: string;
  declare jurisdiction: string;
  declare totalCapital: string;
  declare status: (typeof spvStatuses)[number];
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class SPVOwnership extends Model<InferAttributes<SPVOwnership>, InferCreationAttributes<SPVOwnership>> {
  declare id: CreationOptional<number>;
  declare spvId: number;
  declare investorProfileId: number;
  declare percentage: string;
  declare capitalCommitted: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Deal extends Model<InferAttributes<Deal>, InferCreationAttributes<Deal>> {
  declare id: CreationOptional<number>;
  declare spvId: number;
  declare portfolioId: number | null;
  declare submissionId: number | null;
  declare pricingId: number | null;
  declare approvedByUserId: number | null;
  declare name: string;
  declare status: (typeof dealStatuses)[number];
  declare coverageLimit: string;
  declare attachmentPoint: string;
  declare exhaustionPoint: string;
  declare premium: string;
  declare startDate: Date;
  declare endDate: Date;
  declare subjectsJson: CreationOptional<Record<string, unknown>[] | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Tranche extends Model<InferAttributes<Tranche>, InferCreationAttributes<Tranche>> {
  declare id: CreationOptional<number>;
  declare dealId: number;
  declare name: string;
  declare layerMin: string;
  declare layerMax: string;
  declare returnRate: string;
  declare riskLevel: string;
  declare capitalRequired: string | null;
  declare expectedReturn: string | null;
  declare lossProbability: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class CapitalCommitment extends Model<InferAttributes<CapitalCommitment>, InferCreationAttributes<CapitalCommitment>> {
  declare id: CreationOptional<number>;
  declare investorProfileId: number;
  declare dealId: number;
  declare committedAmount: string;
  declare calledAmount: string;
  declare remainingAmount: string;
  declare status: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class TrancheSubscription extends Model<InferAttributes<TrancheSubscription>, InferCreationAttributes<TrancheSubscription>> {
  declare id: CreationOptional<number>;
  declare trancheId: number;
  declare investorProfileId: number;
  declare committedAmount: string;
  declare deployedAmount: string;
  declare status: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class CollateralAccount extends Model<InferAttributes<CollateralAccount>, InferCreationAttributes<CollateralAccount>> {
  declare id: CreationOptional<number>;
  declare spvId: number;
  declare custodian: string;
  declare accountReference: string;
  declare balance: string;
  declare currency: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class CollateralMovement extends Model<InferAttributes<CollateralMovement>, InferCreationAttributes<CollateralMovement>> {
  declare id: CreationOptional<number>;
  declare collateralAccountId: number;
  declare amount: string;
  declare type: (typeof collateralMovementTypes)[number];
  declare referenceType: string | null;
  declare referenceId: number | null;
  declare occurredAt: Date;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Token extends Model<InferAttributes<Token>, InferCreationAttributes<Token>> {
  declare id: CreationOptional<number>;
  declare spvId: number;
  declare trancheId: number | null;
  declare symbol: string;
  declare totalSupply: string;
  declare circulatingSupply: string;
  declare price: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class TokenHolder extends Model<InferAttributes<TokenHolder>, InferCreationAttributes<TokenHolder>> {
  declare id: CreationOptional<number>;
  declare investorProfileId: number;
  declare tokenId: number;
  declare balance: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Order extends Model<InferAttributes<Order>, InferCreationAttributes<Order>> {
  declare id: CreationOptional<number>;
  declare investorProfileId: number;
  declare tokenId: number;
  declare type: (typeof orderTypes)[number];
  declare quantity: string;
  declare price: string;
  declare status: (typeof orderStatuses)[number];
  declare placedAt: Date;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Trade extends Model<InferAttributes<Trade>, InferCreationAttributes<Trade>> {
  declare id: CreationOptional<number>;
  declare buyOrderId: number;
  declare sellOrderId: number;
  declare tokenId: number;
  declare quantity: string;
  declare price: string;
  declare executedAt: Date;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class TokenTransaction extends Model<InferAttributes<TokenTransaction>, InferCreationAttributes<TokenTransaction>> {
  declare id: CreationOptional<number>;
  declare tokenId: number;
  declare fromHolderId: number | null;
  declare toHolderId: number | null;
  declare tradeId: number | null;
  declare amount: string;
  declare type: (typeof tokenTransactionTypes)[number];
  declare executedAt: Date;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class TokenLock extends Model<InferAttributes<TokenLock>, InferCreationAttributes<TokenLock>> {
  declare id: CreationOptional<number>;
  declare tokenHolderId: number;
  declare quantity: string;
  declare reason: string | null;
  declare lockUntil: Date;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class OrderBookSnapshot extends Model<InferAttributes<OrderBookSnapshot>, InferCreationAttributes<OrderBookSnapshot>> {
  declare id: CreationOptional<number>;
  declare tokenId: number;
  declare bids: Record<string, unknown>[];
  declare asks: Record<string, unknown>[];
  declare capturedAt: Date;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Fee extends Model<InferAttributes<Fee>, InferCreationAttributes<Fee>> {
  declare id: CreationOptional<number>;
  declare type: (typeof feeTypes)[number];
  declare rate: string | null;
  declare amount: string;
  declare chargedToEntityType: string;
  declare chargedToEntityId: number;
  declare referenceType: string | null;
  declare referenceId: number | null;
  declare dealId: number | null;
  declare tradeId: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

const timestampColumns = {
  createdAt: { type: DataTypes.DATE, allowNull: true },
  updatedAt: { type: DataTypes.DATE, allowNull: true },
};

export function initCapitalModels(sequelize: Sequelize): void {
  SPVEntity.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      legalName: { type: DataTypes.STRING, allowNull: false },
      registrationNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
      regulator: { type: DataTypes.STRING, allowNull: true },
      domicile: { type: DataTypes.STRING, allowNull: true },
      ...timestampColumns,
    },
    { sequelize, modelName: 'SPVEntity', tableName: 'spvEntities' },
  );

  SPV.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      spvEntityId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      name: { type: DataTypes.STRING, allowNull: false },
      jurisdiction: { type: DataTypes.STRING, allowNull: false },
      totalCapital: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: '0.00' },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'raising',
        validate: { isIn: [spvStatuses] },
      },
      ...timestampColumns,
    },
    { sequelize, modelName: 'SPV', tableName: 'spvs' },
  );

  SPVOwnership.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      spvId: { type: DataTypes.INTEGER, allowNull: false },
      investorProfileId: { type: DataTypes.INTEGER, allowNull: false },
      percentage: { type: DataTypes.DECIMAL(8, 4), allowNull: false },
      capitalCommitted: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      ...timestampColumns,
    },
    {
      sequelize,
      modelName: 'SPVOwnership',
      tableName: 'spvOwnerships',
      indexes: [{ unique: true, fields: ['spvId', 'investorProfileId'] }],
    },
  );

  Deal.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      spvId: { type: DataTypes.INTEGER, allowNull: false },
      portfolioId: { type: DataTypes.INTEGER, allowNull: true },
      submissionId: { type: DataTypes.INTEGER, allowNull: true },
      pricingId: { type: DataTypes.INTEGER, allowNull: true },
      approvedByUserId: { type: DataTypes.INTEGER, allowNull: true },
      name: { type: DataTypes.STRING, allowNull: false },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'draft',
        validate: { isIn: [dealStatuses] },
      },
      coverageLimit: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      attachmentPoint: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      exhaustionPoint: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      premium: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      startDate: { type: DataTypes.DATEONLY, allowNull: false },
      endDate: { type: DataTypes.DATEONLY, allowNull: false },
      subjectsJson: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
      ...timestampColumns,
    },
    { sequelize, modelName: 'Deal', tableName: 'deals' },
  );

  Tranche.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      dealId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      layerMin: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      layerMax: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      returnRate: { type: DataTypes.DECIMAL(10, 4), allowNull: false },
      riskLevel: { type: DataTypes.STRING, allowNull: false },
      capitalRequired: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      expectedReturn: { type: DataTypes.DECIMAL(10, 4), allowNull: true },
      lossProbability: { type: DataTypes.DECIMAL(10, 6), allowNull: true },
      ...timestampColumns,
    },
    { sequelize, modelName: 'Tranche', tableName: 'tranches' },
  );

  CapitalCommitment.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      investorProfileId: { type: DataTypes.INTEGER, allowNull: false },
      dealId: { type: DataTypes.INTEGER, allowNull: false },
      committedAmount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      calledAmount: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: '0.00' },
      remainingAmount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'committed' },
      ...timestampColumns,
    },
    {
      sequelize,
      modelName: 'CapitalCommitment',
      tableName: 'capitalCommitments',
      indexes: [{ unique: true, fields: ['investorProfileId', 'dealId'] }],
    },
  );

  TrancheSubscription.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      trancheId: { type: DataTypes.INTEGER, allowNull: false },
      investorProfileId: { type: DataTypes.INTEGER, allowNull: false },
      committedAmount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      deployedAmount: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: '0.00' },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'committed' },
      ...timestampColumns,
    },
    {
      sequelize,
      modelName: 'TrancheSubscription',
      tableName: 'trancheSubscriptions',
      indexes: [{ unique: true, fields: ['trancheId', 'investorProfileId'] }],
    },
  );

  CollateralAccount.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      spvId: { type: DataTypes.INTEGER, allowNull: false },
      custodian: { type: DataTypes.STRING, allowNull: false },
      accountReference: { type: DataTypes.STRING, allowNull: false },
      balance: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: '0.00' },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
      ...timestampColumns,
    },
    {
      sequelize,
      modelName: 'CollateralAccount',
      tableName: 'collateralAccounts',
      indexes: [{ unique: true, fields: ['spvId', 'accountReference'] }],
    },
  );

  CollateralMovement.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      collateralAccountId: { type: DataTypes.INTEGER, allowNull: false },
      amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isIn: [collateralMovementTypes] },
      },
      referenceType: { type: DataTypes.STRING, allowNull: true },
      referenceId: { type: DataTypes.INTEGER, allowNull: true },
      occurredAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      ...timestampColumns,
    },
    { sequelize, modelName: 'CollateralMovement', tableName: 'collateralMovements' },
  );

  Token.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      spvId: { type: DataTypes.INTEGER, allowNull: false },
      trancheId: { type: DataTypes.INTEGER, allowNull: true },
      symbol: { type: DataTypes.STRING, allowNull: false, unique: true },
      totalSupply: { type: DataTypes.DECIMAL(24, 8), allowNull: false },
      circulatingSupply: { type: DataTypes.DECIMAL(24, 8), allowNull: false, defaultValue: '0' },
      price: { type: DataTypes.DECIMAL(18, 8), allowNull: false },
      ...timestampColumns,
    },
    { sequelize, modelName: 'Token', tableName: 'tokens' },
  );

  TokenHolder.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      investorProfileId: { type: DataTypes.INTEGER, allowNull: false },
      tokenId: { type: DataTypes.INTEGER, allowNull: false },
      balance: { type: DataTypes.DECIMAL(24, 8), allowNull: false, defaultValue: '0' },
      ...timestampColumns,
    },
    {
      sequelize,
      modelName: 'TokenHolder',
      tableName: 'tokenHolders',
      indexes: [{ unique: true, fields: ['investorProfileId', 'tokenId'] }],
    },
  );

  Order.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      investorProfileId: { type: DataTypes.INTEGER, allowNull: false },
      tokenId: { type: DataTypes.INTEGER, allowNull: false },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isIn: [orderTypes] },
      },
      quantity: { type: DataTypes.DECIMAL(24, 8), allowNull: false },
      price: { type: DataTypes.DECIMAL(18, 8), allowNull: false },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending',
        validate: { isIn: [orderStatuses] },
      },
      placedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      ...timestampColumns,
    },
    { sequelize, modelName: 'Order', tableName: 'orders' },
  );

  Trade.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      buyOrderId: { type: DataTypes.INTEGER, allowNull: false },
      sellOrderId: { type: DataTypes.INTEGER, allowNull: false },
      tokenId: { type: DataTypes.INTEGER, allowNull: false },
      quantity: { type: DataTypes.DECIMAL(24, 8), allowNull: false },
      price: { type: DataTypes.DECIMAL(18, 8), allowNull: false },
      executedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      ...timestampColumns,
    },
    { sequelize, modelName: 'Trade', tableName: 'trades' },
  );

  TokenTransaction.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      tokenId: { type: DataTypes.INTEGER, allowNull: false },
      fromHolderId: { type: DataTypes.INTEGER, allowNull: true },
      toHolderId: { type: DataTypes.INTEGER, allowNull: true },
      tradeId: { type: DataTypes.INTEGER, allowNull: true },
      amount: { type: DataTypes.DECIMAL(24, 8), allowNull: false },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isIn: [tokenTransactionTypes] },
      },
      executedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      ...timestampColumns,
    },
    { sequelize, modelName: 'TokenTransaction', tableName: 'tokenTransactions' },
  );

  TokenLock.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      tokenHolderId: { type: DataTypes.INTEGER, allowNull: false },
      quantity: { type: DataTypes.DECIMAL(24, 8), allowNull: false },
      reason: { type: DataTypes.STRING, allowNull: true },
      lockUntil: { type: DataTypes.DATE, allowNull: false },
      ...timestampColumns,
    },
    { sequelize, modelName: 'TokenLock', tableName: 'tokenLocks' },
  );

  OrderBookSnapshot.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      tokenId: { type: DataTypes.INTEGER, allowNull: false },
      bids: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      asks: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      capturedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      ...timestampColumns,
    },
    { sequelize, modelName: 'OrderBookSnapshot', tableName: 'orderBookSnapshots' },
  );

  Fee.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isIn: [feeTypes] },
      },
      rate: { type: DataTypes.DECIMAL(10, 6), allowNull: true },
      amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      chargedToEntityType: { type: DataTypes.STRING, allowNull: false },
      chargedToEntityId: { type: DataTypes.INTEGER, allowNull: false },
      referenceType: { type: DataTypes.STRING, allowNull: true },
      referenceId: { type: DataTypes.INTEGER, allowNull: true },
      dealId: { type: DataTypes.INTEGER, allowNull: true },
      tradeId: { type: DataTypes.INTEGER, allowNull: true },
      ...timestampColumns,
    },
    { sequelize, modelName: 'Fee', tableName: 'fees' },
  );
}
