import { QueryTypes } from 'sequelize';
import { getSequelize } from '../../src/db/config/database';
import {
  up as repointUp,
  down as repointDown,
} from '../../src/db/migrations/20260606010000-repoint-extracted-fields-fk-to-submission-outputs';

/**
 * Regression test for the extraction-stage failure:
 *   insert or update on table "extracted_fields" violates foreign key
 *   constraint "extracted_fields_document_id_fkey"
 *
 * The original schema FK'd `extracted_fields.document_id` to the legacy
 * `documents` table, but the extraction stage writes the id of a
 * SubmissionOutput row (physical table `submission_outputs`). This test
 * recreates that exact production schema, proves the insert fails, runs the
 * repointing migration, and proves the insert then succeeds against
 * `submission_outputs`.
 *
 * NOTE: the default model harness uses `sequelize.sync()` (which derives FKs from
 * associations and so never reproduced this bug). This suite intentionally builds
 * the migrated schema by hand to exercise the migration itself. Requires Postgres
 * (Node 24 + DB on 5432, per the project test setup).
 */
describe('migration: repoint extracted_fields.document_id FK to submission_outputs', () => {
  const sequelize = getSequelize();
  const qi = sequelize.getQueryInterface();
  const context = { context: qi } as { context: typeof qi };

  // Rebuild the legacy/production schema: extracted_fields -> documents.
  async function buildBuggySchema(): Promise<void> {
    await sequelize.query('DROP TABLE IF EXISTS extracted_fields CASCADE');
    await sequelize.query('DROP TABLE IF EXISTS submission_outputs CASCADE');
    await sequelize.query('DROP TABLE IF EXISTS documents CASCADE');
    await sequelize.query('CREATE TABLE documents (id SERIAL PRIMARY KEY, submission_id INTEGER)');
    await sequelize.query('CREATE TABLE submission_outputs (id SERIAL PRIMARY KEY, submission_id INTEGER)');
    await sequelize.query(
      `CREATE TABLE extracted_fields (
         id SERIAL PRIMARY KEY,
         document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
         field_name TEXT
       )`,
    );
  }

  async function fkTargetTable(): Promise<string | null> {
    const rows: Array<{ foreign_table: string }> = await sequelize.query(
      `SELECT ccu.table_name AS foreign_table
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
         JOIN information_schema.constraint_column_usage ccu
           ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'extracted_fields'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'document_id'`,
      { type: QueryTypes.SELECT },
    );
    return rows[0]?.foreign_table ?? null;
  }

  /** Insert one submission_outputs row + an extracted_field pointing at it. */
  async function insertExtractedFieldForOutput(): Promise<void> {
    const [rows] = await sequelize.query(`INSERT INTO submission_outputs (submission_id) VALUES (1) RETURNING id`);
    const outputId = (rows as Array<{ id: number }>)[0].id;
    await sequelize.query('INSERT INTO extracted_fields (document_id, field_name) VALUES (:id, :name)', {
      replacements: { id: outputId, name: 'limit' },
    });
  }

  beforeAll(async () => {
    await sequelize.authenticate();
  }, 30000);

  afterAll(async () => {
    // Leave the DB clean; the next model suite re-syncs everything anyway.
    await sequelize.query('DROP TABLE IF EXISTS extracted_fields CASCADE');
    await sequelize.query('DROP TABLE IF EXISTS submission_outputs CASCADE');
    await sequelize.query('DROP TABLE IF EXISTS documents CASCADE');
  });

  beforeEach(async () => {
    await buildBuggySchema();
  });

  it('reproduces the FK violation before the migration', async () => {
    expect(await fkTargetTable()).toBe('documents');
    await expect(insertExtractedFieldForOutput()).rejects.toThrow(/foreign key constraint|violates/i);
  });

  it('lets the extraction insert succeed after the migration', async () => {
    await repointUp(context);

    expect(await fkTargetTable()).toBe('submission_outputs');
    await expect(insertExtractedFieldForOutput()).resolves.not.toThrow();

    const [countRows] = await sequelize.query('SELECT COUNT(*)::int AS n FROM extracted_fields');
    expect((countRows as Array<{ n: number }>)[0].n).toBe(1);
  });

  it('still rejects a document_id with no matching submission_outputs row', async () => {
    await repointUp(context);
    await expect(
      sequelize.query('INSERT INTO extracted_fields (document_id, field_name) VALUES (:id, :name)', {
        replacements: { id: 9999, name: 'orphan' },
      }),
    ).rejects.toThrow(/foreign key constraint|violates/i);
  });

  it('is idempotent — running up twice keeps the FK on submission_outputs', async () => {
    await repointUp(context);
    await repointUp(context);
    expect(await fkTargetTable()).toBe('submission_outputs');
  });

  it('down() restores the legacy documents FK', async () => {
    await repointUp(context);
    await repointDown(context);
    expect(await fkTargetTable()).toBe('documents');
  });
});
