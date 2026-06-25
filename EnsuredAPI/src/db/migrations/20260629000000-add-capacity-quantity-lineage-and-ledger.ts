import { DataTypes, QueryInterface, Transaction } from 'sequelize';

/**
 * Capacity spine: quantity block + version lineage, and the stored utilization
 * ledger (all additive).
 *
 *  - `capacityDefinitions` gains a capacity-quantity block (grossCapacity,
 *    netRetention, currency, capacityPeriodBasis) — the denominator for
 *    "remaining capacity" — plus `clonedFromId` for explicit version lineage.
 *  - `capacityUtilizationEntries` records exposure committed against a definition
 *    so deployed/remaining capacity is a stored, point-in-time fact rather than a
 *    re-derivation from policies.
 */

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) =>
    typeof value === 'string' ? value : (value as { tableName: string }).tableName,
  );
  return normalized.includes(tableName);
}

/**
 * Returns the set of existing column names for a table. MUST be called BEFORE any
 * addColumn/removeColumn in the surrounding transaction: `describeTable` runs on a
 * separate pool connection (it does not accept the transaction), so if the
 * transaction has already taken an ACCESS EXCLUSIVE lock on the table via DDL, the
 * describeTable read blocks on that lock forever — an undetectable self-deadlock.
 * Snapshotting once up front avoids re-reading the schema while the lock is held.
 */
async function existingColumns(context: QueryInterface, tableName: string): Promise<Set<string>> {
  const table = await context.describeTable(tableName);
  return new Set(Object.keys(table));
}

const DEFINITION_COLUMNS: Record<string, Parameters<QueryInterface['addColumn']>[2]> = {
  grossCapacity: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
  netRetention: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
  currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'USD' },
  capacityPeriodBasis: { type: DataTypes.STRING, allowNull: true },
  clonedFromId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'capacityDefinitions', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
};

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    if (await tableExists(context, 'capacityDefinitions', transaction)) {
      // Snapshot columns ONCE, before any addColumn takes a lock (see existingColumns).
      const present = await existingColumns(context, 'capacityDefinitions');
      for (const [name, spec] of Object.entries(DEFINITION_COLUMNS)) {
        if (!present.has(name)) {
          await context.addColumn('capacityDefinitions', name, spec, { transaction });
        }
      }
    }

    if (!(await tableExists(context, 'capacityUtilizationEntries', transaction))) {
      await context.createTable(
        'capacityUtilizationEntries',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
          capacityDefinitionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'capacityDefinitions', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          organizationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'organizations', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          lineOfBusinessCode: { type: DataTypes.STRING, allowNull: false, defaultValue: '*' },
          entry: { type: DataTypes.STRING, allowNull: true },
          level: { type: DataTypes.STRING, allowNull: true },
          countryId: { type: DataTypes.INTEGER, allowNull: true },
          stateProvinceId: { type: DataTypes.INTEGER, allowNull: true },
          cityId: { type: DataTypes.INTEGER, allowNull: true },
          subjectType: { type: DataTypes.STRING, allowNull: false },
          subjectId: { type: DataTypes.INTEGER, allowNull: false },
          exposureAmount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
          premiumAmount: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
          currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'USD' },
          status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'bound' },
          effectiveFrom: { type: DataTypes.DATEONLY, allowNull: true },
          effectiveTo: { type: DataTypes.DATEONLY, allowNull: true },
          recordedByUserId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          releasedAt: { type: DataTypes.DATE, allowNull: true },
          createdAt: { type: DataTypes.DATE, allowNull: true },
          updatedAt: { type: DataTypes.DATE, allowNull: true },
        },
        { transaction },
      );
      await context.addIndex('capacityUtilizationEntries', ['organizationId'], { name: 'idx_capacity_util_org', transaction });
      await context.addIndex('capacityUtilizationEntries', ['capacityDefinitionId'], { name: 'idx_capacity_util_def', transaction });
      await context.addIndex('capacityUtilizationEntries', ['capacityDefinitionId', 'status'], { name: 'idx_capacity_util_def_status', transaction });
      await context.addIndex('capacityUtilizationEntries', ['capacityDefinitionId', 'subjectType', 'subjectId'], {
        name: 'uq_capacity_util_def_subject',
        unique: true,
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
    if (await tableExists(context, 'capacityUtilizationEntries', transaction)) {
      await context.dropTable('capacityUtilizationEntries', { transaction });
    }
    if (await tableExists(context, 'capacityDefinitions', transaction)) {
      // Snapshot columns ONCE, before any removeColumn takes a lock (see existingColumns).
      const present = await existingColumns(context, 'capacityDefinitions');
      for (const name of Object.keys(DEFINITION_COLUMNS)) {
        if (present.has(name)) {
          await context.removeColumn('capacityDefinitions', name, { transaction });
        }
      }
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
