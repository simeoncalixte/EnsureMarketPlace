import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';
import {
  accreditationStatuses,
  kycStatuses,
  organizationTypes,
  userRoles,
} from './constants';

export class Organization extends Model<InferAttributes<Organization>, InferCreationAttributes<Organization>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare type: (typeof organizationTypes)[number];
  declare submissionBoardConfig: Record<string, unknown> | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<number>;
  declare organizationId: number | null;
  declare email: string;
  declare passwordHash: string;
  declare role: (typeof userRoles)[number];
  declare firstName: string;
  declare lastName: string;
  declare isActive: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class InvestorProfile extends Model<InferAttributes<InvestorProfile>, InferCreationAttributes<InvestorProfile>> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare accreditationStatus: (typeof accreditationStatuses)[number];
  declare kycStatus: (typeof kycStatuses)[number];
  declare riskPreferences: Record<string, unknown> | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class InsurerProfile extends Model<InferAttributes<InsurerProfile>, InferCreationAttributes<InsurerProfile>> {
  declare id: CreationOptional<number>;
  declare organizationId: number;
  declare rating: string | null;
  declare domicile: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Wallet extends Model<InferAttributes<Wallet>, InferCreationAttributes<Wallet>> {
  declare id: CreationOptional<number>;
  declare investorProfileId: number;
  declare currency: string;
  declare balanceAvailable: string;
  declare balanceLocked: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class BankAccount extends Model<InferAttributes<BankAccount>, InferCreationAttributes<BankAccount>> {
  declare id: CreationOptional<number>;
  declare investorProfileId: number;
  declare bankName: string;
  declare routingNumber: string;
  declare accountNumber: string;
  declare accountType: string | null;
  declare verified: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Notification extends Model<InferAttributes<Notification>, InferCreationAttributes<Notification>> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare type: string;
  declare message: string;
  declare readAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class APIKey extends Model<InferAttributes<APIKey>, InferCreationAttributes<APIKey>> {
  declare id: CreationOptional<number>;
  declare organizationId: number;
  declare keyHash: string;
  declare permissionsJson: Record<string, unknown> | null;
  declare lastUsedAt: Date | null;
  declare expiresAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initIdentityModels(sequelize: Sequelize): void {
  Organization.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isIn: [organizationTypes] },
      },
      submissionBoardConfig: { type: DataTypes.JSONB, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'Organization', tableName: 'organizations', underscored: false },
  );

  User.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      organizationId: { type: DataTypes.INTEGER, allowNull: true },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      passwordHash: { type: DataTypes.STRING, allowNull: false },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isIn: [userRoles] },
      },
      firstName: { type: DataTypes.STRING, allowNull: false },
      lastName: { type: DataTypes.STRING, allowNull: false },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'User', tableName: 'users', underscored: false },
  );

  InvestorProfile.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      accreditationStatus: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending',
        validate: { isIn: [accreditationStatuses] },
      },
      kycStatus: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending',
        validate: { isIn: [kycStatuses] },
      },
      riskPreferences: { type: DataTypes.JSONB, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'InvestorProfile', tableName: 'investorProfiles', underscored: false },
  );

  InsurerProfile.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      organizationId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      rating: { type: DataTypes.STRING, allowNull: true },
      domicile: { type: DataTypes.STRING, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'InsurerProfile', tableName: 'insurerProfiles', underscored: false },
  );

  Wallet.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      investorProfileId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
      balanceAvailable: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: '0.00' },
      balanceLocked: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: '0.00' },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'Wallet', tableName: 'wallets', underscored: false },
  );

  BankAccount.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      investorProfileId: { type: DataTypes.INTEGER, allowNull: false },
      bankName: { type: DataTypes.STRING, allowNull: false },
      routingNumber: { type: DataTypes.STRING, allowNull: false },
      accountNumber: { type: DataTypes.STRING, allowNull: false },
      accountType: { type: DataTypes.STRING, allowNull: true },
      verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'BankAccount', tableName: 'bankAccounts', underscored: false },
  );

  Notification.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      type: { type: DataTypes.STRING, allowNull: false },
      message: { type: DataTypes.TEXT, allowNull: false },
      readAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'Notification', tableName: 'notifications', underscored: false },
  );

  APIKey.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      organizationId: { type: DataTypes.INTEGER, allowNull: false },
      keyHash: { type: DataTypes.STRING, allowNull: false, unique: true },
      permissionsJson: { type: DataTypes.JSONB, allowNull: true },
      lastUsedAt: { type: DataTypes.DATE, allowNull: true },
      expiresAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'APIKey', tableName: 'apiKeys', underscored: false },
  );
}
