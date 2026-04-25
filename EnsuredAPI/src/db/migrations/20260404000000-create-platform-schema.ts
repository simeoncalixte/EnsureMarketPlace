import { DataTypes, QueryInterface } from 'sequelize';

const idColumn = {
  type: DataTypes.INTEGER,
  autoIncrement: true,
  primaryKey: true,
  allowNull: false,
};

const timestamps = {
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
};

function moneyColumn(defaultValue?: string, allowNull = false, precision = 18, scale = 2) {
  return {
    type: DataTypes.DECIMAL(precision, scale),
    allowNull,
    ...(defaultValue === undefined ? {} : { defaultValue }),
  };
}

async function addColumnIfMissing(
  context: QueryInterface,
  tableName: string,
  columnName: string,
  definition: Record<string, unknown>,
  transaction: object,
): Promise<void> {
  const description = await context.describeTable(tableName, { transaction });

  if (!description[columnName]) {
    await context.addColumn(tableName, columnName, definition, { transaction });
  }
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    await context.createTable(
      'organizations',
      {
        id: idColumn,
        name: { type: DataTypes.STRING, allowNull: false },
        type: { type: DataTypes.STRING, allowNull: false },
        ...timestamps,
      },
      { transaction },
    );

    await addColumnIfMissing(
      context,
      'users',
      'organizationId',
      {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'organizations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      transaction,
    );
    await addColumnIfMissing(
      context,
      'users',
      'passwordHash',
      { type: DataTypes.STRING, allowNull: false, defaultValue: 'system-migration-placeholder' },
      transaction,
    );
    await addColumnIfMissing(
      context,
      'users',
      'role',
      { type: DataTypes.STRING, allowNull: false, defaultValue: 'investor' },
      transaction,
    );
    await addColumnIfMissing(
      context,
      'users',
      'isActive',
      { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      transaction,
    );

    await context.createTable(
      'investorProfiles',
      {
        id: idColumn,
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        accreditationStatus: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
        kycStatus: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
        riskPreferences: { type: DataTypes.JSONB, allowNull: true },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'insurerProfiles',
      {
        id: idColumn,
        organizationId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: true,
          references: { model: 'organizations', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        rating: { type: DataTypes.STRING, allowNull: true },
        domicile: { type: DataTypes.STRING, allowNull: true },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'wallets',
      {
        id: idColumn,
        investorProfileId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: true,
          references: { model: 'investorProfiles', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
        balanceAvailable: moneyColumn('0.00'),
        balanceLocked: moneyColumn('0.00'),
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'bankAccounts',
      {
        id: idColumn,
        investorProfileId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'investorProfiles', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        bankName: { type: DataTypes.STRING, allowNull: false },
        routingNumber: { type: DataTypes.STRING, allowNull: false },
        accountNumber: { type: DataTypes.STRING, allowNull: false },
        accountType: { type: DataTypes.STRING, allowNull: true },
        verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'notifications',
      {
        id: idColumn,
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        type: { type: DataTypes.STRING, allowNull: false },
        message: { type: DataTypes.TEXT, allowNull: false },
        readAt: { type: DataTypes.DATE, allowNull: true },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'apiKeys',
      {
        id: idColumn,
        organizationId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'organizations', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        keyHash: { type: DataTypes.STRING, allowNull: false, unique: true },
        permissionsJson: { type: DataTypes.JSONB, allowNull: true },
        lastUsedAt: { type: DataTypes.DATE, allowNull: true },
        expiresAt: { type: DataTypes.DATE, allowNull: true },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'riskPortfolios',
      {
        id: idColumn,
        insurerProfileId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'insurerProfiles', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        name: { type: DataTypes.STRING, allowNull: false },
        region: { type: DataTypes.STRING, allowNull: false },
        perilType: { type: DataTypes.STRING, allowNull: false },
        totalExposure: moneyColumn(),
        currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'submissions',
      {
        id: idColumn,
        insurerProfileId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'insurerProfiles', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        portfolioId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'riskPortfolios', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        submittedByUserId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'draft' },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'modelRuns',
      {
        id: idColumn,
        submissionId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'submissions', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        modelVersion: { type: DataTypes.STRING, allowNull: false },
        parametersJson: { type: DataTypes.JSONB, allowNull: true },
        expectedLoss: moneyColumn(undefined, true, 18, 6),
        var99: moneyColumn(undefined, true, 18, 6),
        outputJson: { type: DataTypes.JSONB, allowNull: true },
        executedByUserId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'pricings',
      {
        id: idColumn,
        submissionId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: true,
          references: { model: 'submissions', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        currentVersionNumber: { type: DataTypes.INTEGER, allowNull: true },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'pricingVersions',
      {
        id: idColumn,
        pricingId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'pricings', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        versionNumber: { type: DataTypes.INTEGER, allowNull: false },
        assumptionsJson: { type: DataTypes.JSONB, allowNull: true },
        premium: moneyColumn(),
        expectedReturn: moneyColumn(undefined, true, 10, 4),
        riskScore: moneyColumn(undefined, true, 10, 4),
        createdByUserId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        ...timestamps,
      },
      { transaction },
    );
    await context.addIndex('pricingVersions', ['pricingId', 'versionNumber'], {
      unique: true,
      name: 'pricing_versions_pricing_id_version_number',
      transaction,
    });

    await context.createTable(
      'spvEntities',
      {
        id: idColumn,
        legalName: { type: DataTypes.STRING, allowNull: false },
        registrationNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
        regulator: { type: DataTypes.STRING, allowNull: true },
        domicile: { type: DataTypes.STRING, allowNull: true },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'spvs',
      {
        id: idColumn,
        spvEntityId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: true,
          references: { model: 'spvEntities', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        name: { type: DataTypes.STRING, allowNull: false },
        jurisdiction: { type: DataTypes.STRING, allowNull: false },
        totalCapital: moneyColumn('0.00'),
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'raising' },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'spvOwnerships',
      {
        id: idColumn,
        spvId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'spvs', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        investorProfileId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'investorProfiles', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        percentage: moneyColumn(undefined, false, 8, 4),
        capitalCommitted: moneyColumn(),
        ...timestamps,
      },
      { transaction },
    );
    await context.addIndex('spvOwnerships', ['spvId', 'investorProfileId'], {
      unique: true,
      name: 'spv_ownerships_spv_id_investor_profile_id',
      transaction,
    });

    await context.createTable(
      'deals',
      {
        id: idColumn,
        spvId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'spvs', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        submissionId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'submissions', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        pricingId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'pricings', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        approvedByUserId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        name: { type: DataTypes.STRING, allowNull: false },
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'draft' },
        coverageLimit: moneyColumn(),
        attachmentPoint: moneyColumn(),
        exhaustionPoint: moneyColumn(),
        premium: moneyColumn(),
        startDate: { type: DataTypes.DATEONLY, allowNull: false },
        endDate: { type: DataTypes.DATEONLY, allowNull: false },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'tranches',
      {
        id: idColumn,
        dealId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'deals', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        name: { type: DataTypes.STRING, allowNull: false },
        layerMin: moneyColumn(),
        layerMax: moneyColumn(),
        returnRate: moneyColumn(undefined, false, 10, 4),
        riskLevel: { type: DataTypes.STRING, allowNull: false },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'capitalCommitments',
      {
        id: idColumn,
        investorProfileId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'investorProfiles', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        dealId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'deals', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        committedAmount: moneyColumn(),
        calledAmount: moneyColumn('0.00'),
        remainingAmount: moneyColumn(),
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'committed' },
        ...timestamps,
      },
      { transaction },
    );
    await context.addIndex('capitalCommitments', ['investorProfileId', 'dealId'], {
      unique: true,
      name: 'capital_commitments_investor_profile_id_deal_id',
      transaction,
    });

    await context.createTable(
      'collateralAccounts',
      {
        id: idColumn,
        spvId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'spvs', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        custodian: { type: DataTypes.STRING, allowNull: false },
        accountReference: { type: DataTypes.STRING, allowNull: false },
        balance: moneyColumn('0.00'),
        currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
        ...timestamps,
      },
      { transaction },
    );
    await context.addIndex('collateralAccounts', ['spvId', 'accountReference'], {
      unique: true,
      name: 'collateral_accounts_spv_id_account_reference',
      transaction,
    });

    await context.createTable(
      'collateralMovements',
      {
        id: idColumn,
        collateralAccountId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'collateralAccounts', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        amount: moneyColumn(),
        type: { type: DataTypes.STRING, allowNull: false },
        referenceType: { type: DataTypes.STRING, allowNull: true },
        referenceId: { type: DataTypes.INTEGER, allowNull: true },
        occurredAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'tokens',
      {
        id: idColumn,
        spvId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'spvs', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        symbol: { type: DataTypes.STRING, allowNull: false, unique: true },
        totalSupply: moneyColumn(undefined, false, 24, 8),
        circulatingSupply: moneyColumn('0', false, 24, 8),
        price: moneyColumn(undefined, false, 18, 8),
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'tokenHolders',
      {
        id: idColumn,
        investorProfileId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'investorProfiles', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        tokenId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'tokens', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        balance: moneyColumn('0', false, 24, 8),
        ...timestamps,
      },
      { transaction },
    );
    await context.addIndex('tokenHolders', ['investorProfileId', 'tokenId'], {
      unique: true,
      name: 'token_holders_investor_profile_id_token_id',
      transaction,
    });

    await context.createTable(
      'orders',
      {
        id: idColumn,
        investorProfileId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'investorProfiles', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        tokenId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'tokens', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        type: { type: DataTypes.STRING, allowNull: false },
        quantity: moneyColumn(undefined, false, 24, 8),
        price: moneyColumn(undefined, false, 18, 8),
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
        placedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'trades',
      {
        id: idColumn,
        buyOrderId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'orders', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        sellOrderId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'orders', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        tokenId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'tokens', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        quantity: moneyColumn(undefined, false, 24, 8),
        price: moneyColumn(undefined, false, 18, 8),
        executedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'tokenTransactions',
      {
        id: idColumn,
        tokenId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'tokens', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        fromHolderId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'tokenHolders', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        toHolderId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'tokenHolders', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        tradeId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'trades', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        amount: moneyColumn(undefined, false, 24, 8),
        type: { type: DataTypes.STRING, allowNull: false },
        executedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'tokenLocks',
      {
        id: idColumn,
        tokenHolderId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'tokenHolders', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        quantity: moneyColumn(undefined, false, 24, 8),
        reason: { type: DataTypes.STRING, allowNull: true },
        lockUntil: { type: DataTypes.DATE, allowNull: false },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'orderBookSnapshots',
      {
        id: idColumn,
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
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'events',
      {
        id: idColumn,
        type: { type: DataTypes.STRING, allowNull: false },
        location: { type: DataTypes.STRING, allowNull: false },
        severity: { type: DataTypes.STRING, allowNull: false },
        occurredAt: { type: DataTypes.DATE, allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'claims',
      {
        id: idColumn,
        dealId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'deals', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        eventId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'events', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        lossAmount: moneyColumn(),
        payoutAmount: moneyColumn(undefined, true),
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'submitted' },
        submittedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        approvedAt: { type: DataTypes.DATE, allowNull: true },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'payouts',
      {
        id: idColumn,
        dealId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'deals', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        claimId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'claims', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        totalAmount: moneyColumn(),
        distributedAt: { type: DataTypes.DATE, allowNull: true },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'investorPayouts',
      {
        id: idColumn,
        payoutId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'payouts', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        investorProfileId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'investorProfiles', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        amount: moneyColumn(),
        ...timestamps,
      },
      { transaction },
    );
    await context.addIndex('investorPayouts', ['payoutId', 'investorProfileId'], {
      unique: true,
      name: 'investor_payouts_payout_id_investor_profile_id',
      transaction,
    });

    await context.createTable(
      'kycRecords',
      {
        id: idColumn,
        investorProfileId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'investorProfiles', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        provider: { type: DataTypes.STRING, allowNull: false },
        verificationLevel: { type: DataTypes.STRING, allowNull: false },
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
        documentsJson: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
        expirationDate: { type: DataTypes.DATE, allowNull: true },
        verifiedAt: { type: DataTypes.DATE, allowNull: true },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'accreditationChecks',
      {
        id: idColumn,
        investorProfileId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'investorProfiles', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
        verifiedAt: { type: DataTypes.DATE, allowNull: true },
        expirationDate: { type: DataTypes.DATE, allowNull: true },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'documents',
      {
        id: idColumn,
        entityType: { type: DataTypes.STRING, allowNull: false },
        entityId: { type: DataTypes.INTEGER, allowNull: false },
        type: { type: DataTypes.STRING, allowNull: false },
        url: { type: DataTypes.STRING, allowNull: false },
        uploadedByUserId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        uploadedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'auditEvents',
      {
        id: idColumn,
        entityType: { type: DataTypes.STRING, allowNull: false },
        entityId: { type: DataTypes.INTEGER, allowNull: false },
        action: { type: DataTypes.STRING, allowNull: false },
        actorId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        metadata: { type: DataTypes.JSONB, allowNull: true },
        occurredAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'ledgerEntries',
      {
        id: idColumn,
        userId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        walletId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'wallets', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        type: { type: DataTypes.STRING, allowNull: false },
        amount: moneyColumn(),
        referenceType: { type: DataTypes.STRING, allowNull: false },
        referenceId: { type: DataTypes.INTEGER, allowNull: true },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'fees',
      {
        id: idColumn,
        type: { type: DataTypes.STRING, allowNull: false },
        rate: moneyColumn(undefined, true, 10, 6),
        amount: moneyColumn(),
        chargedToEntityType: { type: DataTypes.STRING, allowNull: false },
        chargedToEntityId: { type: DataTypes.INTEGER, allowNull: false },
        referenceType: { type: DataTypes.STRING, allowNull: true },
        referenceId: { type: DataTypes.INTEGER, allowNull: true },
        dealId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'deals', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        tradeId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'trades', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        ...timestamps,
      },
      { transaction },
    );

    await context.createTable(
      'riskMetrics',
      {
        id: idColumn,
        dealId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'deals', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        metricType: { type: DataTypes.STRING, allowNull: false },
        value: moneyColumn(undefined, false, 18, 6),
        sourceModelRunId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'modelRuns', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        calculatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        ...timestamps,
      },
      { transaction },
    );

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    await context.dropTable('riskMetrics', { transaction });
    await context.dropTable('fees', { transaction });
    await context.dropTable('ledgerEntries', { transaction });
    await context.dropTable('auditEvents', { transaction });
    await context.dropTable('documents', { transaction });
    await context.dropTable('accreditationChecks', { transaction });
    await context.dropTable('kycRecords', { transaction });
    await context.dropTable('investorPayouts', { transaction });
    await context.dropTable('payouts', { transaction });
    await context.dropTable('claims', { transaction });
    await context.dropTable('events', { transaction });
    await context.dropTable('orderBookSnapshots', { transaction });
    await context.dropTable('tokenLocks', { transaction });
    await context.dropTable('tokenTransactions', { transaction });
    await context.dropTable('trades', { transaction });
    await context.dropTable('orders', { transaction });
    await context.dropTable('tokenHolders', { transaction });
    await context.dropTable('tokens', { transaction });
    await context.dropTable('collateralMovements', { transaction });
    await context.dropTable('collateralAccounts', { transaction });
    await context.dropTable('capitalCommitments', { transaction });
    await context.dropTable('tranches', { transaction });
    await context.dropTable('deals', { transaction });
    await context.dropTable('spvOwnerships', { transaction });
    await context.dropTable('spvs', { transaction });
    await context.dropTable('spvEntities', { transaction });
    await context.dropTable('pricingVersions', { transaction });
    await context.dropTable('pricings', { transaction });
    await context.dropTable('modelRuns', { transaction });
    await context.dropTable('submissions', { transaction });
    await context.dropTable('riskPortfolios', { transaction });
    await context.dropTable('apiKeys', { transaction });
    await context.dropTable('notifications', { transaction });
    await context.dropTable('bankAccounts', { transaction });
    await context.dropTable('wallets', { transaction });
    await context.dropTable('insurerProfiles', { transaction });
    await context.dropTable('investorProfiles', { transaction });

    const userDescription = await context.describeTable('users', { transaction });
    if (userDescription.isActive) {
      await context.removeColumn('users', 'isActive', { transaction });
    }
    if (userDescription.role) {
      await context.removeColumn('users', 'role', { transaction });
    }
    if (userDescription.passwordHash) {
      await context.removeColumn('users', 'passwordHash', { transaction });
    }
    if (userDescription.organizationId) {
      await context.removeColumn('users', 'organizationId', { transaction });
    }

    await context.dropTable('organizations', { transaction });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}