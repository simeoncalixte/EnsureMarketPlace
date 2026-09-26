import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(path.join(root, 'pipeline-packages.json'), 'utf8'));
const command = process.argv[2] || 'verify';
let failed = false;
for (const pkg of manifest.packages) {
  const directory = path.join(root, pkg.directory);
  if (command === 'verify') {
    const info = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
    for (const [name, version] of Object.entries(info.dependencies || {})) {
      if (name === 'ensured-api' || version.includes('EnsuredAPI')) throw new Error(`${pkg.name} depends on the API`);
      if (version.startsWith('file:') && !existsSync(path.resolve(directory, version.slice(5), 'package.json'))) throw new Error(`Missing dependency ${name}`);
    }
    console.log(`Verified ${pkg.name}`);
  } else {
    console.log(`\n${command}: ${pkg.name}`);
    const result = spawnSync('npm', ['run', command, '--', ...process.argv.slice(3)], { cwd: directory, stdio: 'inherit' });
    if (result.status !== 0) { failed = true; if (command === 'build') break; }
  }
}
process.exitCode = failed ? 1 : 0;
