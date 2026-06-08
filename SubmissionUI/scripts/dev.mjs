import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function startProcess(args) {
  return spawn(npmCommand, args, {
    cwd: packageDir,
    env: process.env,
    stdio: 'inherit',
  });
}

const frontend = startProcess(['run', 'frontend']);
const relay = startProcess(['run', 'relay']);

let shuttingDown = false;

function shutdown(code = 0, signal = 'SIGTERM') {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  [frontend, relay].forEach((child) => {
    if (!child.killed) {
      child.kill(signal);
    }
  });

  process.exit(code);
}

process.on('SIGINT', () => shutdown(0, 'SIGINT'));
process.on('SIGTERM', () => shutdown(0, 'SIGTERM'));

[frontend, relay].forEach((child) => {
  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    shutdown(typeof code === 'number' ? code : signal ? 1 : 0, signal ?? 'SIGTERM');
  });
});