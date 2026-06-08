import { QueryInterface, QueryTypes, Transaction } from 'sequelize';

/**
 * Repoint the `extracted_fields.document_id` foreign key from the legacy
 * `documents` table to `submission_outputs` (the table SubmissionDocument now
 * maps to, after `20260514000000-rename-submission-documents-to-outputs`).
 *
 * The extraction stage persists a SubmissionDocument (→ submission_outputs) and
 * writes ExtractedField.documentId = that row's id, but the original FK still
 * referenced `documents(id)` — a different table the pipeline never populates —
 * so every insert failed with `extracted_fields_document_id_fkey`. This aligns
 * the physical constraint with the ORM association
 * (`ExtractedField.belongsTo(SubmissionDocument)`).
 */

const TABLE = 'extracted_fields';
const COLUMN = 'document_id';
const CONSTRAINT = 'extracted_fields_document_id_fkey';

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const rows = await context.sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = :tableName
    ) AS "exists"`,
    { type: QueryTypes.SELECT, replacements: { tableName }, transaction },
  );
  return Boolean(rows[0]?.exists);
}

/** Every FOREIGN KEY constraint currently on extracted_fields.document_id. */
async function foreignKeysOnColumn(context: QueryInterface, transaction: Transaction): Promise<string[]> {
  const rows: Array<{ constraint_name: string }> = await context.sequelize.query(
    `SELECT tc.constraint_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
        AND tc.constraint_schema = kcu.constraint_schema
      WHERE tc.table_name = :table
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = :column`,
    { type: QueryTypes.SELECT, replacements: { table: TABLE, column: COLUMN }, transaction },
  );
  return rows.map((r) => r.constraint_name).filter(Boolean);
}

async function dropForeignKeys(context: QueryInterface, transaction: Transaction): Promise<void> {
  for (const name of await foreignKeysOnColumn(context, transaction)) {
    try {
      await context.removeConstraint(TABLE, name, { transaction });
    } catch (_) {
      try {
        await context.sequelize.query(`ALTER TABLE "${TABLE}" DROP CONSTRAINT "${name}"`, { transaction });
      } catch (_) {
        /* ignore — best effort */
      }
    }
  }
}

async function addForeignKey(
  context: QueryInterface,
  referencedTable: string,
  transaction: Transaction,
): Promise<void> {
  await context.addConstraint(TABLE, {
    fields: [COLUMN],
    type: 'foreign key',
    name: CONSTRAINT,
    references: { table: referencedTable, field: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    transaction,
  } as never);
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    if (!(await tableExists(context, TABLE, transaction))) {
      await transaction.commit();
      return;
    }

    // Prefer the current table name; fall back to the pre-rename name just in case.
    const target = (await tableExists(context, 'submission_outputs', transaction))
      ? 'submission_outputs'
      : (await tableExists(context, 'submission_documents', transaction))
        ? 'submission_documents'
        : null;

    // Clear the stale FK (and any duplicate) regardless of whether we can re-add.
    await dropForeignKeys(context, transaction);

    if (target) {
      try {
        await addForeignKey(context, target, transaction);
      } catch (_) {
        /* a concurrent/duplicate constraint — leave the column unconstrained rather than fail */
      }
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
    if (!(await tableExists(context, TABLE, transaction))) {
      await transaction.commit();
      return;
    }

    await dropForeignKeys(context, transaction);

    // Restore the original constraint pointing at the legacy `documents` table.
    if (await tableExists(context, 'documents', transaction)) {
      try {
        await addForeignKey(context, 'documents', transaction);
      } catch (_) {
        /* ignore */
      }
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
