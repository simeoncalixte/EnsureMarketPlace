import { DataTypes, QueryInterface, Transaction } from 'sequelize';

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

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) => (typeof value === 'string' ? value : value.tableName));
  return normalized.includes(tableName);
}

async function addColumnIfMissing(
  context: QueryInterface,
  tableName: string,
  columnName: string,
  definition: Record<string, unknown>,
  transaction: Transaction,
): Promise<void> {
  const description = await context.describeTable(tableName, { transaction });
  if (!description[columnName]) {
    await context.addColumn(tableName, columnName, definition, { transaction });
  }
}

async function removeColumnIfPresent(
  context: QueryInterface,
  tableName: string,
  columnName: string,
  transaction: Transaction,
): Promise<void> {
  const description = await context.describeTable(tableName, { transaction });
  if (description[columnName]) {
    await context.removeColumn(tableName, columnName, { transaction });
  }
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    await addColumnIfMissing(context, 'riskPortfolios', 'totalPremium', moneyColumn(undefined, true), transaction);
    await addColumnIfMissing(context, 'riskPortfolios', 'expectedLoss', moneyColumn(undefined, true, 18, 6), transaction);
    await addColumnIfMissing(context, 'riskPortfolios', 'var95', moneyColumn(undefined, true, 18, 6), transaction);
    await addColumnIfMissing(context, 'riskPortfolios', 'var99', moneyColumn(undefined, true, 18, 6), transaction);

    if (!(await tableExists(context, 'policies', transaction))) {
      await context.createTable(
        'policies',
        {
          id: idColumn,
          externalPolicyId: { type: DataTypes.STRING, allowNull: false, unique: true },
          insurerProfileId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'insurerProfiles', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          portfolioId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'riskPortfolios', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          submissionId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'submissions', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          policyType: { type: DataTypes.STRING, allowNull: false },
          effectiveDate: { type: DataTypes.DATEONLY, allowNull: false },
          expirationDate: { type: DataTypes.DATEONLY, allowNull: false },
          premium: moneyColumn(),
          insuredValue: moneyColumn(),
          deductible: moneyColumn(undefined, true),
          coverageLimit: moneyColumn(undefined, true),
          latitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
          longitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
          region: { type: DataTypes.STRING, allowNull: true },
          perilCoverage: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
          underwritingScore: { type: DataTypes.DECIMAL(6, 4), allowNull: true },
          currency: { type: DataTypes.STRING(3), allowNull: true },
          normalizedCurrency: { type: DataTypes.STRING(3), allowNull: true },
          normalizationRate: { type: DataTypes.DECIMAL(24, 12), allowNull: true },
          normalizationAt: { type: DataTypes.DATE, allowNull: true },
          ...timestamps,
        },
        { transaction },
      );

      await context.addIndex('policies', ['insurerProfileId'], {
        name: 'policies_insurer_profile_id',
        transaction,
      });
      await context.addIndex('policies', ['portfolioId'], {
        name: 'policies_portfolio_id',
        transaction,
      });
      await context.addIndex('policies', ['submissionId'], {
        name: 'policies_submission_id',
        transaction,
      });
    }

    if (!(await tableExists(context, 'exposureUnits', transaction))) {
      await context.createTable(
        'exposureUnits',
        {
          id: idColumn,
          exposureRef: { type: DataTypes.STRING, allowNull: false, unique: true },
          policyId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'policies', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          assetType: { type: DataTypes.STRING, allowNull: false },
          constructionType: { type: DataTypes.STRING, allowNull: true },
          occupancyType: { type: DataTypes.STRING, allowNull: true },
          replacementCost: moneyColumn(undefined, true),
          latitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
          longitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
          vulnerabilityScore: { type: DataTypes.DECIMAL(6, 4), allowNull: true },
          ...timestamps,
        },
        { transaction },
      );

      await context.addIndex('exposureUnits', ['policyId'], {
        name: 'exposure_units_policy_id',
        transaction,
      });
    }

    await addColumnIfMissing(context, 'deals', 'portfolioId', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'riskPortfolios', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    }, transaction);

    await addColumnIfMissing(context, 'tranches', 'capitalRequired', moneyColumn(undefined, true), transaction);
    await addColumnIfMissing(context, 'tranches', 'expectedReturn', moneyColumn(undefined, true, 10, 4), transaction);
    await addColumnIfMissing(context, 'tranches', 'lossProbability', moneyColumn(undefined, true, 10, 6), transaction);

    if (!(await tableExists(context, 'trancheSubscriptions', transaction))) {
      await context.createTable(
        'trancheSubscriptions',
        {
          id: idColumn,
          trancheId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'tranches', key: 'id' },
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
          committedAmount: moneyColumn(),
          deployedAmount: moneyColumn('0.00'),
          status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'committed' },
          ...timestamps,
        },
        { transaction },
      );

      await context.addIndex('trancheSubscriptions', ['trancheId', 'investorProfileId'], {
        name: 'tranche_subscriptions_tranche_id_investor_profile_id',
        unique: true,
        transaction,
      });
    }

    await addColumnIfMissing(context, 'tokens', 'trancheId', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'tranches', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    }, transaction);

    await addColumnIfMissing(context, 'claims', 'portfolioId', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'riskPortfolios', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    }, transaction);

    if (!(await tableExists(context, 'legalDocuments', transaction))) {
      await context.createTable(
        'legalDocuments',
        {
          id: idColumn,
          entityType: { type: DataTypes.STRING, allowNull: false },
          entityId: { type: DataTypes.INTEGER, allowNull: false },
          docType: { type: DataTypes.STRING, allowNull: false },
          url: { type: DataTypes.STRING, allowNull: false },
          required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
          signer: { type: DataTypes.STRING, allowNull: true },
          issuedAt: { type: DataTypes.DATE, allowNull: true },
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
    }

    if (!(await tableExists(context, 'triggers', transaction))) {
      await context.createTable(
        'triggers',
        {
          id: idColumn,
          portfolioId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'riskPortfolios', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          dealId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'deals', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          type: { type: DataTypes.STRING, allowNull: false },
          definitionJson: { type: DataTypes.JSONB, allowNull: true },
          ...timestamps,
        },
        { transaction },
      );
    }

    if (!(await tableExists(context, 'parametricDefinitions', transaction))) {
      await context.createTable(
        'parametricDefinitions',
        {
          id: idColumn,
          triggerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'triggers', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          indexName: { type: DataTypes.STRING, allowNull: false },
          threshold: { type: DataTypes.STRING, allowNull: false },
          payoutFormula: { type: DataTypes.TEXT, allowNull: true },
          ...timestamps,
        },
        { transaction },
      );
    }

    if (!(await tableExists(context, 'claimCalculations', transaction))) {
      await context.createTable(
        'claimCalculations',
        {
          id: idColumn,
          claimId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'claims', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          inputsJson: { type: DataTypes.JSONB, allowNull: true },
          stepsJson: { type: DataTypes.JSONB, allowNull: true },
          resultJson: { type: DataTypes.JSONB, allowNull: true },
          executedAt: { type: DataTypes.DATE, allowNull: true },
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
    if (await tableExists(context, 'claimCalculations', transaction)) {
      await context.dropTable('claimCalculations', { transaction });
    }
    if (await tableExists(context, 'parametricDefinitions', transaction)) {
      await context.dropTable('parametricDefinitions', { transaction });
    }
    if (await tableExists(context, 'triggers', transaction)) {
      await context.dropTable('triggers', { transaction });
    }
    if (await tableExists(context, 'legalDocuments', transaction)) {
      await context.dropTable('legalDocuments', { transaction });
    }
    if (await tableExists(context, 'trancheSubscriptions', transaction)) {
      await context.dropTable('trancheSubscriptions', { transaction });
    }
    if (await tableExists(context, 'exposureUnits', transaction)) {
      await context.dropTable('exposureUnits', { transaction });
    }
    if (await tableExists(context, 'policies', transaction)) {
      await context.dropTable('policies', { transaction });
    }

    await removeColumnIfPresent(context, 'claims', 'portfolioId', transaction);
    await removeColumnIfPresent(context, 'tokens', 'trancheId', transaction);
    await removeColumnIfPresent(context, 'deals', 'portfolioId', transaction);

    await removeColumnIfPresent(context, 'tranches', 'lossProbability', transaction);
    await removeColumnIfPresent(context, 'tranches', 'expectedReturn', transaction);
    await removeColumnIfPresent(context, 'tranches', 'capitalRequired', transaction);

    await removeColumnIfPresent(context, 'riskPortfolios', 'var99', transaction);
    await removeColumnIfPresent(context, 'riskPortfolios', 'var95', transaction);
    await removeColumnIfPresent(context, 'riskPortfolios', 'expectedLoss', transaction);
    await removeColumnIfPresent(context, 'riskPortfolios', 'totalPremium', transaction);

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
