import { DataTypes, QueryInterface } from 'sequelize';

/**
 * Creates the `submission_outputs` table backing the `SubmissionDocument` model.
 *
 * An earlier migration (20260514000000-rename-submission-documents-to-outputs)
 * renamed a `submission_documents` table that was never actually created, so the
 * table has been missing — breaking OCR/classification/extraction persistence.
 * This creates it. It's a mutable per-submission processing artifact (OCR text →
 * classification → structured data), so it carries created_at + updated_at.
 */

async function tableExists(context: QueryInterface, name: string): Promise<boolean> {
  const tables = await context.showAllTables();
  return tables.map((t) => String(t).toLowerCase()).includes(name.toLowerCase());
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  if (await tableExists(context, 'submission_outputs')) {
    return;
  }

  const transaction = await context.sequelize.transaction();
  try {
    await context.createTable(
      'submission_outputs',
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        submission_id: { type: DataTypes.INTEGER, allowNull: true },
        tenant_id: { type: DataTypes.INTEGER, allowNull: true },
        document_type: { type: DataTypes.STRING, allowNull: true },
        classification_confidence: { type: DataTypes.FLOAT, allowNull: true },
        structured_data: { type: DataTypes.JSONB, allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      },
      { transaction },
    );
    await context.addIndex('submission_outputs', ['submission_id'], { transaction });

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  if (!(await tableExists(context, 'submission_outputs'))) {
    return;
  }
  await context.dropTable('submission_outputs');
}
