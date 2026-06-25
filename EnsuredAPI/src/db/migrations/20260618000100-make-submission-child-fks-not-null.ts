/**
 * H2 — required-child integrity.
 *
 * These rows cannot meaningfully exist without their parent (a SubmissionFile
 * with no submission is an orphan), yet the linking FK was nullable. This flips
 * each to NOT NULL. The whole migration runs in one transaction, so if any table
 * still holds orphan rows (FK IS NULL) the SET NOT NULL fails and the migration
 * rolls back cleanly — clean up the orphans, then re-run.
 *
 * Scope is the ingestion + pipeline lineage. Already-required columns
 * (canonical_submissions.submission_id, modelRuns.submissionId) and intentionally
 * optional ones (agent_traces.submission_id) are left untouched.
 */
import { DataTypes, QueryInterface } from 'sequelize';

// [table, candidate column names] — first existing variant is altered.
const REQUIRED_FKS: Array<[string, string[]]> = [
  ['submission_files', ['submission_id', 'submissionId']],
  ['ingestion_events', ['submission_id', 'submissionId']],
  ['submission_outputs', ['submission_id', 'submissionId']],
  ['extracted_fields', ['document_id', 'documentId']],
  ['enrichment_data', ['submission_id', 'submissionId']],
  ['triage_results', ['submission_id', 'submissionId']],
  ['workflow_states', ['submission_id', 'submissionId']],
  ['pipeline_runs', ['submission_id', 'submissionId']],
  ['stage_executions', ['submission_id', 'submissionId']],
  ['pipeline_artifacts', ['submission_id', 'submissionId']],
];

function pick(description: Record<string, unknown>, candidates: string[]): string | undefined {
  return candidates.find((name) => Object.prototype.hasOwnProperty.call(description, name));
}

async function setNullability({ context }: { context: QueryInterface }, allowNull: boolean): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    for (const [table, candidates] of REQUIRED_FKS) {
      let description: Record<string, unknown>;
      try {
        description = await context.describeTable(table, { transaction } as never);
      } catch {
        continue;
      }
      const column = pick(description, candidates);
      if (!column) continue;
      await context.changeColumn(table, column, { type: DataTypes.INTEGER, allowNull }, { transaction });
    }
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  await setNullability({ context }, false);
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  await setNullability({ context }, true);
}
