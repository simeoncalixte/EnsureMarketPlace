import { DataTypes, QueryInterface } from 'sequelize';

/**
 * Removes the `extracted_text` column from `submission_outputs`.
 *
 * OCR output is now persisted under `structured_data.ocr` (alongside the other
 * stages' namespaced blocks), so the dedicated text column is redundant. To avoid
 * losing already-captured text on existing databases, any non-null `extracted_text`
 * is folded into `structured_data->'ocr'->'text'` before the column is dropped.
 *
 * Idempotent: a no-op when the column is already gone (e.g. fresh databases created
 * after the create migration stopped provisioning it).
 */

async function columnExists(context: QueryInterface, table: string, column: string): Promise<boolean> {
  try {
    const description = await context.describeTable(table);
    return Object.prototype.hasOwnProperty.call(description, column);
  } catch (_) {
    return false;
  }
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  if (!(await columnExists(context, 'submission_outputs', 'extracted_text'))) {
    return;
  }

  const transaction = await context.sequelize.transaction();
  try {
    // Fold surviving OCR text into structured_data.ocr.text so nothing is lost.
    await context.sequelize.query(
      `UPDATE submission_outputs
         SET structured_data = jsonb_set(
               COALESCE(structured_data, '{}'::jsonb),
               '{ocr,text}',
               to_jsonb(extracted_text),
               true
             )
       WHERE extracted_text IS NOT NULL
         AND (structured_data #>> '{ocr,text}') IS NULL`,
      { transaction },
    );
    await context.removeColumn('submission_outputs', 'extracted_text', { transaction });
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  if (await columnExists(context, 'submission_outputs', 'extracted_text')) {
    return;
  }
  await context.addColumn('submission_outputs', 'extracted_text', {
    type: DataTypes.TEXT,
    allowNull: true,
  });
}
