/**
 * Standalone runner for the pipeline operation-catalog registry process.
 *
 * Registers (idempotently, additively) every canonical pipeline operation that is
 * not yet present in `pipelineOperationCatalogs`. New modules added to
 * `src/pipeline/operations/catalog.ts` get inserted; existing rows are untouched.
 *
 * Usage:
 *   npm run sync:pipeline-operations
 *
 * NO new table, NO schema change — writes only into the EXISTING
 * pipelineOperationCatalogs table.
 */
import { getSequelize, closeSequelize } from './config/database';
import { syncPipelineOperationCatalog } from '../services/pipeline/operations/catalog';

async function run(): Promise<void> {
  const sequelize = getSequelize();
  await sequelize.authenticate();

  const result = await syncPipelineOperationCatalog();
  console.log(
    `[sync:pipeline-operations] added ${result.added.length}: ${result.added.join(', ') || '(none)'}; ` +
      `pruned ${result.pruned.length} stale: ${result.pruned.join(', ') || '(none)'}; ` +
      `${result.existing.length} were present` +
      (result.keptReferenced.length
        ? `; kept ${result.keptReferenced.length} stale-but-referenced: ${result.keptReferenced.join(', ')}`
        : '') +
      '.',
  );
}

run()
  .catch((error) => {
    console.error('[sync:pipeline-operations] failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeSequelize();
  });
