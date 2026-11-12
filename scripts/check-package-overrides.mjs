import { readFileSync, existsSync, realpathSync, lstatSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = file => JSON.parse(readFileSync(file, 'utf8'));
const privateName = name => name.startsWith('@ensured/') || name.startsWith('@simeoncalixte/');
export function checkConsumer(directory, installed = false) {
  const errors = [];
  const metadata = json(path.join(directory, 'package.json'));
  const lockPath = path.join(directory, 'package-lock.json');
  const lock = existsSync(lockPath) ? json(lockPath) : null;
  const dependencies = { ...metadata.dependencies, ...metadata.devDependencies, ...metadata.optionalDependencies };
  for (const [name, spec] of Object.entries(dependencies).filter(([name]) => privateName(name))) {
    const entry = lock?.packages?.[`node_modules/${name}`];
    if (!entry) errors.push(`${name}: missing locked registry artifact`);
    else if (!entry.integrity || !entry.resolved?.startsWith('https://npm.pkg.github.com/')) errors.push(`${name}: missing registry URL or integrity`);
    if (lock) {
      const lockedSpec = { ...lock.packages?.['']?.dependencies, ...lock.packages?.['']?.devDependencies, ...lock.packages?.['']?.optionalDependencies }[name];
      if (lockedSpec !== spec) errors.push(`${name}: lockfile declaration differs from manifest`);
      const version = spec.startsWith('npm:') ? spec.slice(spec.lastIndexOf('@') + 1) : spec;
      if (/^\d+\.\d+\.\d+$/.test(version) && entry?.version !== version) errors.push(`${name}: lockfile artifact differs from declared version`);
    }
    if (/^(file:|link:|workspace:)/.test(spec)) errors.push(`${name}: local dependency ${spec}`);
    if (entry?.link || entry?.resolved?.startsWith('../')) errors.push(`${name}: local lockfile resolution`);
    if (installed) {
      const target = path.join(directory, 'node_modules', name);
      if (!existsSync(target)) { errors.push(`${name}: missing consumer installation`); continue; }
      const real = realpathSync(target);
      if (lstatSync(target).isSymbolicLink() || !real.startsWith(realpathSync(path.join(directory, 'node_modules')) + path.sep)) errors.push(`${name}: installed source link ${real}`);
      const pkg = json(path.join(target, 'package.json'));
      if (entry?.version && pkg.version !== entry.version) errors.push(`${name}: installed version differs from lockfile`);
    }
  }
  return errors;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const installed = process.argv.includes('--installed');
  const selected = process.argv.slice(2).filter(arg => arg !== '--installed');
  const directories = selected.length ? selected : ['.', ...readdirSync(root).filter(name => existsSync(path.join(root, name, 'package.json'))), 'EnsuredNetwork/frontend'];
  const errors = [];
  for (const directory of directories) {
    if (!existsSync(path.join(root, directory, 'package.json'))) continue;
    errors.push(...checkConsumer(path.join(root, directory), installed).map(error => `${directory}: ${error}`));
  }
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log(`Package override check passed (${installed ? 'installed packages and manifests' : 'manifests and lockfiles'}).`);
}
