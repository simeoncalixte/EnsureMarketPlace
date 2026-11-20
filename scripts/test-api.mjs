import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const discoveryOnly = args.some((arg) =>
  ['--listTests', '--showConfig', '--help', '-h', '--version', '-v'].includes(arg.split('=')[0]),
);
const project = `ensured-api-test-${randomBytes(6).toString('hex')}`;
const password = randomBytes(24).toString('hex');
const compose = ['compose', '-p', project, '-f', path.join(root, 'docker-compose.api-test.yml')];

/** @param {string[]} command */
function docker(command) {
  const result = spawnSync('docker', [...compose, ...command], {
    cwd: root,
    env: { ...process.env, API_TEST_PASSWORD: password },
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Test database command failed. Is Docker running?\n${result.stderr}`);
  }
  return result.stdout;
}

/** @param {NodeJS.ProcessEnv} env */
async function jest(env) {
  const child = spawn(
    process.execPath,
    [
      path.join(root, 'EnsuredAPI/node_modules/jest/bin/jest.js'),
      '--config',
      path.join(root, 'jest.config.cjs'),
      '--runInBand',
      ...args,
    ],
    { cwd: root, env, stdio: 'inherit' },
  );
  const interrupt = () => child.kill('SIGINT');
  const terminate = () => child.kill('SIGTERM');
  process.on('SIGINT', interrupt);
  process.on('SIGTERM', terminate);
  try {
    return await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code) => resolve(code ?? 1));
    });
  } finally {
    process.off('SIGINT', interrupt);
    process.off('SIGTERM', terminate);
  }
}

try {
  if (discoveryOnly) {
    process.exitCode = await jest(process.env);
  } else {
    try {
      docker(['up', '-d', '--wait', '--wait-timeout', '60']);
      const port = Number(docker(['port', 'postgres', '5432']).trim().split(':').at(-1));
      if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
        throw new Error('Could not resolve the disposable test database port');
      }
      process.exitCode = await jest({
        ...process.env,
        NODE_ENV: 'test',
        DB_HOST: '127.0.0.1',
        DB_PORT: String(port),
        DB_USER: 'postgres',
        DB_PASSWORD: password,
        DB_NAME: 'ensured_marketplace_test',
        // This runner owns an isolated database, so these persistence tests can
        // run from the editor without a separate shell-only opt-in.
        MANUAL_SUBMISSION_DB_TESTS: '1',
        RUN_DOCUMENT_TYPE_DB_TESTS: '1',
      });
    } finally {
      // Only this invocation's random Compose project is removed.
      docker(['down', '--volumes', '--remove-orphans']);
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
