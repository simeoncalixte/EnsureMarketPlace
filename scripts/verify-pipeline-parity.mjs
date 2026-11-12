// Release parity: compare freshly built owners with the artifacts consumers resolve.
// The one-time pre-extraction body audit is scripts/audit-pipeline-extraction.mjs.
import { readFileSync, existsSync, readdirSync, lstatSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = p => JSON.parse(readFileSync(p, 'utf8'));
export function artifactInventory(directory) {
  const files = {};
  function walk(current, prefix = '') {
    for (const entry of readdirSync(current, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
      const relative = prefix + entry.name;
      if (entry.isDirectory()) walk(path.join(current, entry.name), relative + '/');
      else files[relative] = createHash('sha256').update(readFileSync(path.join(current, entry.name))).digest('hex');
    }
  }
  walk(directory);
  if (!Object.keys(files).length) throw new Error(`Empty artifact: ${directory}`);
  return files;
}
export function compareArtifacts(expected, actual) {
  return [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort()
    .filter(file => expected[file] !== actual[file]);
}
export function verifyOwnership(base, manifest) {
  const errors = [];
  const owners = new Map(manifest.packages.map(p => [p.directory, p.name]));
  for (const [old, info] of Object.entries(manifest.files)) {
    if (owners.get(info.directory) !== info.package) errors.push(`Invalid owner: ${old}`);
    if (!existsSync(path.join(base, info.directory, info.path))) errors.push(`Missing owned source: ${info.directory}/${info.path}`);
  }
  for (const [old, info] of Object.entries(manifest.retiredFiles || {})) {
    if (manifest.files[old] || !info.reason || !info.replacements?.length) errors.push(`Invalid retirement: ${old}`);
    if (existsSync(path.join(base, info.directory, info.path))) errors.push(`Retired source reappeared: ${old}`);
    for (const replacement of info.replacements || []) {
      if (!existsSync(path.join(base, info.directory, replacement))) errors.push(`Missing replacement: ${info.directory}/${replacement}`);
    }
  }
  return errors;
}
export function verifyPin(name, version, consumer, lock) {
  const errors = [];
  if (consumer.dependencies?.[name] !== version) errors.push(`Dependency must pin ${name}@${version}`);
  const locked = lock.packages?.[`node_modules/${name}`];
  if (lock.packages?.['']?.dependencies?.[name] !== version || locked?.version !== version || locked?.link || !locked?.integrity || !locked?.resolved?.startsWith('https://npm.pkg.github.com/')) {
    errors.push(`Lockfile must pin registry artifact ${name}@${version} with integrity`);
  }
  return errors;
}
export function verifyRelease(base = root) {
  const manifest = json(path.join(base, 'pipeline-packages.json'));
  const errors = verifyOwnership(base, manifest);
  const financial = manifest.packages.filter(p => ['shared', 'capacity', 'riskCompute'].includes(p.key));
  if (financial.length !== 3) errors.push('Missing required shared/capacity/riskCompute package owner');
  const consumers = ['EnsuredAPI', ...financial.map(p => p.directory)];
  const evidence = [];
  for (const owner of financial) {
    const directory = path.join(base, owner.directory);
    const pkg = json(path.join(directory, 'package.json'));
    // Never accept yesterday's dist directory as evidence of today's source.
    const build = spawnSync('npm', ['run', 'build'], { cwd: directory, stdio: 'inherit' });
    if (build.error || build.status !== 0) { errors.push(`Fresh build failed: ${owner.directory}`); continue; }
    const expected = artifactInventory(path.join(directory, 'dist'));
    for (const consumer of consumers) {
      if (consumer === owner.directory) continue;
      const consumerPath = path.join(base, consumer, 'package.json');
      const metadata = json(consumerPath);
      if (consumer !== 'EnsuredAPI' && !metadata.dependencies?.[pkg.name]) continue;
      try {
        if (consumer === 'EnsuredAPI') {
          errors.push(...verifyPin(pkg.name, pkg.version, metadata, json(path.join(base, consumer, 'package-lock.json'))).map(e => `${consumer}: ${e}`));
        } else if (metadata.dependencies?.[pkg.name] !== pkg.version) {
          errors.push(`${consumer}: dependency must pin ${pkg.name}@${pkg.version}`);
        }
        const require = createRequire(consumerPath);
        const installedPath = require.resolve(`${pkg.name}/package.json`);
        const declaredLocation = path.join(base, consumer, 'node_modules', pkg.name);
        if (!existsSync(declaredLocation) || lstatSync(declaredLocation).isSymbolicLink() || !realpathSync(installedPath).startsWith(realpathSync(path.join(base, consumer, 'node_modules')) + path.sep)) {
          errors.push(`${consumer}: local package override or inherited installation for ${pkg.name}`);
        }
        const installed = json(installedPath);
        if (installed.version !== pkg.version) errors.push(`${consumer}: resolves ${pkg.name}@${installed.version}, expected ${pkg.version}`);
        const actual = artifactInventory(path.join(path.dirname(installedPath), 'dist'));
        const differences = compareArtifacts(expected, actual);
        if (differences.length) errors.push(`${consumer}: stale ${pkg.name}@${pkg.version}: ${differences.length} artifact differences (${differences.slice(0,5).join(', ')})`);
        evidence.push({ consumer, package: pkg.name, version: installed.version, files: Object.keys(actual).length, sha256: createHash('sha256').update(JSON.stringify(actual)).digest('hex'), matchesSourceBuild: !differences.length });
      } catch (error) { errors.push(`${consumer}: cannot inspect ${pkg.name}: ${error.message}`); }
    }
  }
  console.log(JSON.stringify({ financialArtifacts: evidence, errors }, null, 2));
  return errors;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = verifyRelease().length ? 1 : 0;
