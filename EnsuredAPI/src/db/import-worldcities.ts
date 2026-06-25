/**
 * CLI entry point for the worldcities.csv importer. The streaming, two-pass import logic lives in
 * `worldcities-import-runner.ts` (shared with the admin trigger route); this wrapper just resolves
 * the CSV path from CLI args, runs the import, and owns the Sequelize connection lifecycle.
 *
 * Usage:  npm run import:worldcities -- --file=/abs/path/worldcities.csv
 *         WORLDCITIES_CSV=/abs/path/worldcities.csv npm run import:worldcities
 */
import { closeSequelize } from '../config/database';
import { runWorldcitiesImport } from './worldcities-import-runner';

const fileArg = process.argv.find((a) => a.startsWith('--file='));
const file = fileArg ? fileArg.slice('--file='.length) : null;

runWorldcitiesImport({ file })
  .catch((error) => {
    console.error('[worldcities] import failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeSequelize();
  });
