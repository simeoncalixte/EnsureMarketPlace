/**
 * Slice 5.3 — standalone runner for the platform-default benchmark priors +
 * casualty registry rows.
 *
 * Seeds (idempotently) the cited platform-default benchmark priors and the
 * platform-default casualty registry rows that select the `casualty_ilf` rating
 * strategy. Both use upsert-by-scope, so re-running changes nothing.
 *
 * Usage:
 *   npm run seed:benchmark-priors
 *
 * NO new table, NO schema change — this only writes data into the EXISTING
 * benchmark_priors and risk_class_registry tables.
 */
import { getSequelize, closeSequelize } from './config/database';
import { seedBenchmarkPriors } from '../services/pipeline/benchmarkPriors/seed';
import { seedCasualtyRegistryRows, seedCatRegistryRows } from '../services/pipeline/registry/seed';

async function run(): Promise<void> {
  const sequelize = getSequelize();
  await sequelize.authenticate();

  const priors = await seedBenchmarkPriors();
  const registryRows = await seedCasualtyRegistryRows();
  const catRegistryRows = await seedCatRegistryRows();

  console.log(
    `[seed:benchmark-priors] upserted ${priors.length} platform-default benchmark priors, ` +
      `${registryRows.length} platform-default casualty registry rows (casualty_ilf), and ` +
      `${catRegistryRows.length} platform-default cat registry row(s) (cat_exposure).`,
  );
  console.log(
    `[seed:benchmark-priors] priors: ${priors
      .map((p) => `${p.lineOfBusinessCode}${p.lineOfBusinessSubTypeCode ? '/' + p.lineOfBusinessSubTypeCode : ''}`)
      .join(', ')}`,
  );
}

run()
  .catch((error) => {
    console.error('[seed:benchmark-priors] seed failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeSequelize();
  });
