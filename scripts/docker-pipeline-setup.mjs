import { readFileSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packages = [{ directory: 'EnsuredConstants', name: '@simeoncalixte/ensured-constants' }, ...JSON.parse(readFileSync(path.join(root, 'pipeline-packages.json'), 'utf8')).packages];
function run(args, cwd) {
  const result = spawnSync('npm', args, { cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`npm ${args.join(' ')} failed in ${cwd}`);
}
function linkLocal(directory, available) {
  const info = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
  for (const pkg of available) {
    if (!info.dependencies?.[pkg.name] && !info.devDependencies?.[pkg.name]) continue;
    const target = path.join(directory, 'node_modules', pkg.name);
    mkdirSync(path.dirname(target), { recursive: true });
    rmSync(target, { recursive: true, force: true });
    symlinkSync(path.join(root, pkg.directory), target, 'dir');
  }
}
if (process.argv.includes('--link-api')) {
  linkLocal(path.join(root, 'EnsuredAPI'), packages);
} else {
  const built = [];
  for (const pkg of packages) {
    const directory = path.join(root, pkg.directory);
    run(['install', '--include=dev', '--ignore-scripts', '--no-audit', '--no-fund'], directory);
    linkLocal(directory, built);
    run(['run', 'build'], directory);
    built.push(pkg);
  }
}
