import { DataTypes, QueryInterface, Transaction } from 'sequelize';

/**
 * Close-the-loop Issue 2 — quote issuance + policy lifecycle/versioning.
 *
 * Strictly ADDITIVE: three new tables + three nullable columns on `policies`. No
 * existing column is altered or dropped, so seeded/legacy policies are unaffected.
 *
 *   - `quotes`          — one quote header per submission (cf. `pricings`).
 *   - `quote_versions`  — immutable offer revisions (cf. `pricing_versions`); each
 *                         references the `PricingVersion` it was built on.
 *   - `policy_versions` — immutable policy revisions (issuance + endorsements).
 *   - policies.+sourceQuoteId / status / currentVersionNumber — bind link + lifecycle.
 *
 * The three new tables are `underscored` (snake_case columns), mirroring the newer
 * `submissions` / `canonical_submissions` tables. The added `policies` columns are
 * camelCase, matching that table's existing convention. Idempotent guards mirror
 * the existing migrations.
 */

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) =>
    typeof value === 'string' ? value : (value as { tableName: string }).tableName,
  );
  return normalized.includes(tableName);
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    if (!(await tableExists(context, 'quotes', transaction))) {
      await context.createTable(
        'quotes',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
          submission_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            references: { model: 'submissions', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          tenant_id: { type: DataTypes.INTEGER, allowNull: true },
          insurer_profile_id: { type: DataTypes.INTEGER, allowNull: true },
          quote_number: { type: DataTypes.STRING, allowNull: false, unique: true },
          status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'issued' },
          current_version_number: { type: DataTypes.INTEGER, allowNull: true },
          bound_policy_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'policies', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          created_by_user_id: { type: DataTypes.INTEGER, allowNull: true },
          created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
          updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        { transaction },
      );
      await context.addIndex('quotes', ['submission_id'], { transaction, name: 'quotes_submission_idx' });
    }

    if (!(await tableExists(context, 'quote_versions', transaction))) {
      await context.createTable(
        'quote_versions',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
          quote_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'quotes', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          version_number: { type: DataTypes.INTEGER, allowNull: false },
          pricing_version_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'pricingVersions', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'issued' },
          premium: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
          currency: { type: DataTypes.STRING(3), allowNull: true, defaultValue: 'USD' },
          commission_rate: { type: DataTypes.DECIMAL(10, 4), allowNull: true },
          coverage_limit: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
          attachment_point: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
          deductible: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
          effective_date: { type: DataTypes.DATEONLY, allowNull: true },
          expiration_date: { type: DataTypes.DATEONLY, allowNull: true },
          terms_json: { type: DataTypes.JSONB, allowNull: true },
          valid_until: { type: DataTypes.DATE, allowNull: true },
          document_ref: { type: DataTypes.STRING, allowNull: true },
          issued_at: { type: DataTypes.DATE, allowNull: true },
          issued_by_user_id: { type: DataTypes.INTEGER, allowNull: true },
          decision_at: { type: DataTypes.DATE, allowNull: true },
          decision_by_user_id: { type: DataTypes.INTEGER, allowNull: true },
          decision_reason: { type: DataTypes.STRING, allowNull: true },
          created_by_user_id: { type: DataTypes.INTEGER, allowNull: true },
          created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
          updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        { transaction },
      );
      await context.addIndex('quote_versions', ['quote_id', 'version_number'], {
        transaction,
        unique: true,
        name: 'quote_versions_quote_version_uidx',
      });
    }

    if (!(await tableExists(context, 'policy_versions', transaction))) {
      await context.createTable(
        'policy_versions',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
          policy_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'policies', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          version_number: { type: DataTypes.INTEGER, allowNull: false },
          change_type: { type: DataTypes.STRING, allowNull: false },
          status: { type: DataTypes.STRING, allowNull: false },
          source_quote_version_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'quote_versions', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          premium: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
          coverage_limit: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
          deductible: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
          effective_date: { type: DataTypes.DATEONLY, allowNull: false },
          expiration_date: { type: DataTypes.DATEONLY, allowNull: false },
          effective_from: { type: DataTypes.DATEONLY, allowNull: true },
          terms_json: { type: DataTypes.JSONB, allowNull: true },
          reason: { type: DataTypes.STRING, allowNull: true },
          created_by_user_id: { type: DataTypes.INTEGER, allowNull: true },
          created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
          updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        { transaction },
      );
      await context.addIndex('policy_versions', ['policy_id', 'version_number'], {
        transaction,
        unique: true,
        name: 'policy_versions_policy_version_uidx',
      });
    }

    // Additive columns on the existing (camelCase) policies table.
    const policies = await context.describeTable('policies');
    if (!policies['sourceQuoteId']) {
      await context.addColumn(
        'policies',
        'sourceQuoteId',
        {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'quotes', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        { transaction },
      );
    }
    if (!policies['status']) {
      await context.addColumn('policies', 'status', { type: DataTypes.STRING, allowNull: true }, { transaction });
    }
    if (!policies['currentVersionNumber']) {
      await context.addColumn('policies', 'currentVersionNumber', { type: DataTypes.INTEGER, allowNull: true }, { transaction });
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
    const policies = await context.describeTable('policies');
    if (policies['currentVersionNumber']) await context.removeColumn('policies', 'currentVersionNumber', { transaction });
    if (policies['status']) await context.removeColumn('policies', 'status', { transaction });
    if (policies['sourceQuoteId']) await context.removeColumn('policies', 'sourceQuoteId', { transaction });

    if (await tableExists(context, 'policy_versions', transaction)) await context.dropTable('policy_versions', { transaction });
    if (await tableExists(context, 'quote_versions', transaction)) await context.dropTable('quote_versions', { transaction });
    if (await tableExists(context, 'quotes', transaction)) await context.dropTable('quotes', { transaction });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
