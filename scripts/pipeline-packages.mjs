import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(path.join(root, 'pipeline-packages.json'), 'utf8'));
const command = process.argv[2] || 'verify';
if (command === 'publish' && !process.env.NODE_AUTH_TOKEN) throw new Error('Set NODE_AUTH_TOKEN with read:packages and write:packages permissions before publishing.');
const allowed = new Set(['verify', 'setup', 'build', 'test', 'publish']);
if (!allowed.has(command)) throw new Error(`Unknown pipeline command: ${command}`);
function run(args, cwd) {
  const result = spawnSync('npm', args, { cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`npm ${args.join(' ')} failed in ${cwd}`);
}
for (const pkg of manifest.packages) {
  const directory = path.join(root, pkg.directory);
  const info = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
  if (info.name !== pkg.name || info.private || info.publishConfig?.registry !== 'https://npm.pkg.github.com') {
    throw new Error(`Invalid publish configuration: ${pkg.directory}`);
  }
  for (const [name, version] of Object.entries(info.dependencies || {})) {
    if (name === 'ensured-api' || /^(file:|link:|workspace:)/.test(version)) {
      throw new Error(`Non-registry dependency in ${pkg.name}: ${name}=${version}`);
    }
  }
  console.log(`${command}: ${pkg.name}@${info.version}`);
  if (command === 'verify') continue;
  if (command === 'setup') {
    run(['install', '--include=dev'], directory);
    run(['run', 'build'], directory);
  } else if (command === 'publish') {
    // Run in dependency order so each install uses already-published releases.
    // First release also replaces legacy local-link lockfiles with registry metadata.
    run(['install', '--package-lock-only', '--ignore-scripts', '--include=dev'], directory);
    run(['ci', '--include=dev'], directory);
    run(['publish'], directory); // prepack builds the artifact before publishing.
  } else {
    run(['run', command, '--', ...process.argv.slice(3)], directory);
  }
}
