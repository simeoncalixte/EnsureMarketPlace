import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const envPath = 'EnsuredAPI/.env';
let catalogEnv = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
let catalog = parseEnv(catalogEnv);
if (!catalog.SERVICES_READ_TOKEN) {
  catalogEnv += `\nSERVICES_READ_TOKEN=${randomBytes(32).toString('hex')}\n`;
  writeFileSync(envPath, catalogEnv, { mode: 0o600 });
  catalog = parseEnv(catalogEnv);
}
const env = { ...process.env, DOCKER_SERVICES_READ_TOKEN: catalog.SERVICES_READ_TOKEN };
function docker(args, capture = false) {
  const result = spawnSync('docker', args, { env, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit' });
  if (result.status !== 0) throw new Error(`Docker ${args[0]} failed${capture ? ': ' + result.stderr : ''}`);
  return result.stdout;
}
const members = { 'ensured-api': 'api', 'ensured-ui': 'frontend.localhost', 'ensuredauth-mailpit-1': 'mailpit', 'ensured-submission-rabbitmq': 'rabbitmq' };
const networks = docker(['network', 'ls', '--format', '{{.Name}}'], true).trim().split('\n').map(Name => ({ Name }));
if (!networks.some(item => item.Name === 'ensured-platform')) docker(['network', 'create', 'ensured-platform']);
for (const [container, alias] of Object.entries(members)) {
  const info = JSON.parse(docker(['inspect', container], true))[0];
  if (!info.State.Running) docker(['start', container]);
  if (!info.NetworkSettings.Networks['ensured-platform']) docker(['network', 'connect', '--alias', alias, 'ensured-platform', container]);
  docker(['update', '--restart', 'unless-stopped', container], true);
}
const command = process.argv.slice(2);
if (!command.length || command[0] === 'up' || command[0] === 'start') {
  const result = spawnSync(process.execPath, ['scripts/start-database.mjs'], { env, stdio: 'inherit' });
  if (result.status !== 0) throw new Error('Shared database startup failed');
}
docker(['compose', '-p', 'ensured-services', '-f', 'docker-compose.services.yml', ...(command.length ? command : ['up', '-d', '--build', '--wait'])]);
