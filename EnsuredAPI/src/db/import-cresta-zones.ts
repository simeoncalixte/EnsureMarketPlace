/**
 * CLI wrapper for the resumable, throttled CRESTA-zone importer. The actual logic lives in
 * `cresta-import-runner.ts` (shared with the admin trigger route).
 *
 * Usage:
 *   npm run import:cresta-zones                      # everything still pending
 *   npm run import:cresta-zones -- --only=ATG,RUS    # restrict to countries
 *   npm run import:cresta-zones -- --level=city      # restrict to one level
 *   npm run import:cresta-zones -- --pageSize=1000   # override page size for new rows
 *
 * One request per 30s; checkpoints after every page, so it can be killed and re-run to resume.
 */
import { QueryTypes } from 'sequelize';
import { getSequelize, closeSequelize } from './config/database';
import { CrestaLevel } from './models/cresta.models';
import { runCrestaImport, stopCrestaImport } from './cresta-import-runner';

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

async function run(): Promise<void> {
  const onlyArg = arg('only');
  const opts = {
    only: onlyArg ? onlyArg.split(',') : null,
    level: (arg('level') as CrestaLevel | undefined) ?? null,
    pageSize: arg('pageSize') ? Number(arg('pageSize')) : undefined,
  };

  process.on('SIGINT', () => {
    console.log('\n[cresta] SIGINT — finishing current checkpoint then exiting…');
    stopCrestaImport();
  });

  await runCrestaImport(opts);

  const sequelize = getSequelize();
  const [{ complete, remaining, zones }] = await sequelize.query<{ complete: string; remaining: string; zones: string }>(
    `SELECT
       (SELECT count(*) FROM "crestaImportProgress" WHERE status = 'complete')::text AS complete,
       (SELECT count(*) FROM "crestaImportProgress" WHERE status NOT IN ('complete','unavailable'))::text AS remaining,
       (SELECT count(*) FROM "crestaZones")::text AS zones`,
    { type: QueryTypes.SELECT },
  );
  console.log(`[cresta] run finished. complete=${complete}, remaining=${remaining}, total zones stored=${zones}`);
}

run()
  .catch((error) => {
    console.error('[cresta] import failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeSequelize();
  });
