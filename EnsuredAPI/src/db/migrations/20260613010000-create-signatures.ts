import { DataTypes, QueryInterface, Transaction } from 'sequelize';

/**
 * Standalone signature collection point — two new tables, no existing table
 * touched and no foreign key into any domain (the subject is referenced by an
 * opaque subject_type/subject_id pair). Strictly ADDITIVE. Idempotent guards
 * mirror the existing migrations. Columns are snake_case (underscored models).
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
    if (!(await tableExists(context, 'signature_requests', transaction))) {
      await context.createTable(
        'signature_requests',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
          tenant_id: { type: DataTypes.INTEGER, allowNull: true },
          subject_type: { type: DataTypes.STRING, allowNull: false },
          subject_id: { type: DataTypes.INTEGER, allowNull: false },
          title: { type: DataTypes.STRING, allowNull: true },
          document_hash: { type: DataTypes.STRING, allowNull: false },
          document_ref: { type: DataTypes.STRING, allowNull: true },
          status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
          expires_at: { type: DataTypes.DATE, allowNull: true },
          completed_at: { type: DataTypes.DATE, allowNull: true },
          created_by_user_id: { type: DataTypes.INTEGER, allowNull: true },
          created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
          updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        { transaction },
      );
      await context.addIndex('signature_requests', ['subject_type', 'subject_id'], {
        transaction,
        name: 'signature_requests_subject_idx',
      });
      await context.addIndex('signature_requests', ['tenant_id'], {
        transaction,
        name: 'signature_requests_tenant_idx',
      });
    }

    if (!(await tableExists(context, 'signatures', transaction))) {
      await context.createTable(
        'signatures',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
          signature_request_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'signature_requests', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          signer_name: { type: DataTypes.STRING, allowNull: false },
          signer_email: { type: DataTypes.STRING, allowNull: true },
          signer_role: { type: DataTypes.STRING, allowNull: true },
          signing_order: { type: DataTypes.INTEGER, allowNull: true },
          status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
          capture_type: { type: DataTypes.STRING, allowNull: true },
          signature_data: { type: DataTypes.TEXT, allowNull: true },
          proof: { type: DataTypes.STRING, allowNull: true },
          signed_document_hash: { type: DataTypes.STRING, allowNull: true },
          signed_at: { type: DataTypes.DATE, allowNull: true },
          declined_reason: { type: DataTypes.STRING, allowNull: true },
          ip_address: { type: DataTypes.STRING, allowNull: true },
          user_agent: { type: DataTypes.STRING, allowNull: true },
          signed_by_user_id: { type: DataTypes.INTEGER, allowNull: true },
          created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
          updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        { transaction },
      );
      await context.addIndex('signatures', ['signature_request_id'], {
        transaction,
        name: 'signatures_request_idx',
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
    if (await tableExists(context, 'signatures', transaction)) await context.dropTable('signatures', { transaction });
    if (await tableExists(context, 'signature_requests', transaction)) await context.dropTable('signature_requests', { transaction });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
