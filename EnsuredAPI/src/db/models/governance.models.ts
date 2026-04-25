import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';
import { accreditationStatuses, auditActions, claimStatuses, kycStatuses, ledgerEntryTypes, triggerTypes } from './constants';

export class KYCRecord extends Model<InferAttributes<KYCRecord>, InferCreationAttributes<KYCRecord>> {
  declare id: CreationOptional<number>;
  declare investorProfileId: number;
  declare provider: string;
  declare verificationLevel: string;
  declare status: (typeof kycStatuses)[number];
  declare documentsJson: Record<string, unknown>[];
  declare expirationDate: Date | null;
  declare verifiedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class AccreditationCheck extends Model<InferAttributes<AccreditationCheck>, InferCreationAttributes<AccreditationCheck>> {
  declare id: CreationOptional<number>;
  declare investorProfileId: number;
  declare status: (typeof accreditationStatuses)[number];
  declare verifiedAt: Date | null;
  declare expirationDate: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class PlatformEvent extends Model<InferAttributes<PlatformEvent>, InferCreationAttributes<PlatformEvent>> {
  declare id: CreationOptional<number>;
  declare type: string;
  declare location: string;
  declare severity: string;
  declare occurredAt: Date;
  declare description: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Claim extends Model<InferAttributes<Claim>, InferCreationAttributes<Claim>> {
  declare id: CreationOptional<number>;
  declare portfolioId: number | null;
  declare policyId: number | null;
  declare dealId: number;
  declare eventId: number;
  declare lossAmount: string;
  declare payoutAmount: string | null;
  declare status: (typeof claimStatuses)[number];
  declare submittedAt: Date;
  declare approvedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Payout extends Model<InferAttributes<Payout>, InferCreationAttributes<Payout>> {
  declare id: CreationOptional<number>;
  declare dealId: number;
  declare claimId: number | null;
  declare totalAmount: string;
  declare distributedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class InvestorPayout extends Model<InferAttributes<InvestorPayout>, InferCreationAttributes<InvestorPayout>> {
  declare id: CreationOptional<number>;
  declare payoutId: number;
  declare investorProfileId: number;
  declare amount: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class LedgerEntry extends Model<InferAttributes<LedgerEntry>, InferCreationAttributes<LedgerEntry>> {
  declare id: CreationOptional<number>;
  declare userId: number | null;
  declare walletId: number | null;
  declare type: (typeof ledgerEntryTypes)[number];
  declare amount: string;
  declare referenceType: string;
  declare referenceId: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Document extends Model<InferAttributes<Document>, InferCreationAttributes<Document>> {
  declare id: CreationOptional<number>;
  declare entityType: string;
  declare entityId: number;
  declare type: string;
  declare url: string;
  declare uploadedByUserId: number | null;
  declare uploadedAt: Date;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class LegalDocument extends Model<InferAttributes<LegalDocument>, InferCreationAttributes<LegalDocument>> {
  declare id: CreationOptional<number>;
  declare entityType: string;
  declare entityId: number;
  declare docType: string;
  declare url: string;
  declare required: boolean;
  declare signer: string | null;
  declare issuedAt: Date | null;
  declare uploadedByUserId: number | null;
  declare uploadedAt: Date;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Trigger extends Model<InferAttributes<Trigger>, InferCreationAttributes<Trigger>> {
  declare id: CreationOptional<number>;
  declare portfolioId: number | null;
  declare dealId: number | null;
  declare type: (typeof triggerTypes)[number];
  declare definitionJson: Record<string, unknown> | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class ParametricDefinition extends Model<InferAttributes<ParametricDefinition>, InferCreationAttributes<ParametricDefinition>> {
  declare id: CreationOptional<number>;
  declare triggerId: number;
  declare indexName: string;
  declare threshold: string;
  declare payoutFormula: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class ClaimCalculation extends Model<InferAttributes<ClaimCalculation>, InferCreationAttributes<ClaimCalculation>> {
  declare id: CreationOptional<number>;
  declare claimId: number;
  declare inputsJson: Record<string, unknown> | null;
  declare stepsJson: Record<string, unknown> | null;
  declare resultJson: Record<string, unknown> | null;
  declare executedAt: Date | null;
  declare executedByUserId: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class AuditEvent extends Model<InferAttributes<AuditEvent>, InferCreationAttributes<AuditEvent>> {
  declare id: CreationOptional<number>;
  declare entityType: string;
  declare entityId: number;
  declare action: (typeof auditActions)[number];
  declare actorId: number | null;
  declare metadata: Record<string, unknown> | null;
  declare occurredAt: Date;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initGovernanceModels(sequelize: Sequelize): void {
  KYCRecord.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      investorProfileId: { type: DataTypes.INTEGER, allowNull: false },
      provider: { type: DataTypes.STRING, allowNull: false },
      verificationLevel: { type: DataTypes.STRING, allowNull: false },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending',
        validate: { isIn: [kycStatuses] },
      },
      documentsJson: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      expirationDate: { type: DataTypes.DATE, allowNull: true },
      verifiedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'KYCRecord', tableName: 'kycRecords' },
  );

  AccreditationCheck.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      investorProfileId: { type: DataTypes.INTEGER, allowNull: false },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending',
        validate: { isIn: [accreditationStatuses] },
      },
      verifiedAt: { type: DataTypes.DATE, allowNull: true },
      expirationDate: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'AccreditationCheck', tableName: 'accreditationChecks' },
  );

  PlatformEvent.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      type: { type: DataTypes.STRING, allowNull: false },
      location: { type: DataTypes.STRING, allowNull: false },
      severity: { type: DataTypes.STRING, allowNull: false },
      occurredAt: { type: DataTypes.DATE, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'PlatformEvent', tableName: 'events' },
  );

  Claim.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      portfolioId: { type: DataTypes.INTEGER, allowNull: true },
      policyId: { type: DataTypes.INTEGER, allowNull: true },
      dealId: { type: DataTypes.INTEGER, allowNull: false },
      eventId: { type: DataTypes.INTEGER, allowNull: false },
      lossAmount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      payoutAmount: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'submitted',
        validate: { isIn: [claimStatuses] },
      },
      submittedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      approvedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'Claim', tableName: 'claims' },
  );

  Payout.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      dealId: { type: DataTypes.INTEGER, allowNull: false },
      claimId: { type: DataTypes.INTEGER, allowNull: true },
      totalAmount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      distributedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'Payout', tableName: 'payouts' },
  );

  InvestorPayout.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      payoutId: { type: DataTypes.INTEGER, allowNull: false },
      investorProfileId: { type: DataTypes.INTEGER, allowNull: false },
      amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'InvestorPayout',
      tableName: 'investorPayouts',
      indexes: [{ unique: true, fields: ['payoutId', 'investorProfileId'] }],
    },
  );

  LedgerEntry.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: true },
      walletId: { type: DataTypes.INTEGER, allowNull: true },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isIn: [ledgerEntryTypes] },
      },
      amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      referenceType: { type: DataTypes.STRING, allowNull: false },
      referenceId: { type: DataTypes.INTEGER, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'LedgerEntry', tableName: 'ledgerEntries' },
  );

  Document.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      entityType: { type: DataTypes.STRING, allowNull: false },
      entityId: { type: DataTypes.INTEGER, allowNull: false },
      type: { type: DataTypes.STRING, allowNull: false },
      url: { type: DataTypes.STRING, allowNull: false },
      uploadedByUserId: { type: DataTypes.INTEGER, allowNull: true },
      uploadedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'Document', tableName: 'documents' },
  );

  LegalDocument.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      entityType: { type: DataTypes.STRING, allowNull: false },
      entityId: { type: DataTypes.INTEGER, allowNull: false },
      docType: { type: DataTypes.STRING, allowNull: false },
      url: { type: DataTypes.STRING, allowNull: false },
      required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      signer: { type: DataTypes.STRING, allowNull: true },
      issuedAt: { type: DataTypes.DATE, allowNull: true },
      uploadedByUserId: { type: DataTypes.INTEGER, allowNull: true },
      uploadedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'LegalDocument', tableName: 'legalDocuments' },
  );

  Trigger.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      portfolioId: { type: DataTypes.INTEGER, allowNull: true },
      dealId: { type: DataTypes.INTEGER, allowNull: true },
      type: { type: DataTypes.STRING, allowNull: false, validate: { isIn: [triggerTypes] } },
      definitionJson: { type: DataTypes.JSONB, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'Trigger', tableName: 'triggers' },
  );

  ParametricDefinition.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      triggerId: { type: DataTypes.INTEGER, allowNull: false },
      indexName: { type: DataTypes.STRING, allowNull: false },
      threshold: { type: DataTypes.STRING, allowNull: false },
      payoutFormula: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'ParametricDefinition', tableName: 'parametricDefinitions' },
  );

  ClaimCalculation.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      claimId: { type: DataTypes.INTEGER, allowNull: false },
      inputsJson: { type: DataTypes.JSONB, allowNull: true },
      stepsJson: { type: DataTypes.JSONB, allowNull: true },
      resultJson: { type: DataTypes.JSONB, allowNull: true },
      executedAt: { type: DataTypes.DATE, allowNull: true },
      executedByUserId: { type: DataTypes.INTEGER, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'ClaimCalculation', tableName: 'claimCalculations' },
  );

  AuditEvent.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      entityType: { type: DataTypes.STRING, allowNull: false },
      entityId: { type: DataTypes.INTEGER, allowNull: false },
      action: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isIn: [auditActions] },
      },
      actorId: { type: DataTypes.INTEGER, allowNull: true },
      metadata: { type: DataTypes.JSONB, allowNull: true },
      occurredAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'AuditEvent', tableName: 'auditEvents' },
  );
}