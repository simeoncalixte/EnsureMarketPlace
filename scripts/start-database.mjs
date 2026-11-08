import { spawnSync } from 'node:child_process';
import { discoverDatabases, provisioningSql } from './database-config.mjs';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const plan = discoverDatabases(process.cwd());
for (const source of plan.skipped) console.info(`Skipping non-shared database: ${source}`);
function docker(args, input) {
  const result = spawnSync('docker', args, {
    input, stdio: input ? 'pipe' : 'inherit',
  });
  if (result.status !== 0) throw new Error(`Docker ${args[0]} failed`);
}
// Refuse to start an empty replacement while legacy databases are still active.
for (const container of ['ensuredauth-identity-db-1', 'ensuredkyc-kyc-db-1']) {
  const result = spawnSync('docker', ['inspect', '--format', '{{.State.Running}}', container], { encoding: 'utf8' });
  if (result.stdout?.trim() === 'true') {
    throw new Error(`Migrate ${container} into the shared PostgreSQL service and stop it first. See README.md.`);
  }
}
const network = spawnSync('docker', ['network', 'inspect', 'ensured-platform'], { stdio: 'ignore' });
if (network.status !== 0) docker(['network', 'create', 'ensured-platform']);
docker(['compose', '-f', 'docker-compose.database.yml', 'up', '-d', '--wait', 'postgres']);
// PostgreSQL entrypoint init scripts only run on empty volumes.
// Provision missing databases on existing marketplace volumes as well.
docker(['exec', '-i', 'ensured-api-postgres', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'],
  provisioningSql(plan.databases));
console.info(`Shared database setup complete: ${plan.databases.length} configured databases (existing data and credentials preserved).`);
