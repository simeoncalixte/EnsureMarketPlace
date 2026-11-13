import { readFileSync, readdirSync, mkdtempSync, rmSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkConsumer } from './check-package-overrides.mjs';
import { artifactInventory, compareArtifacts } from './verify-pipeline-parity.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function verifyIntegrity(bytes, integrity) {
  return integrity.split(/\s+/).some((entry) => {
    const separator = entry.indexOf('-');
    const algorithm = entry.slice(0, separator);
    if (!['sha256', 'sha384', 'sha512'].includes(algorithm)) return false;
    return createHash(algorithm).update(bytes).digest('base64') === entry.slice(separator + 1);
  });
}
export function comparePublishedFiles(published, installed) {
  const actual = {};
  for (const entry of readdirSync(installed)) {
    if (entry === 'node_modules' || entry === '.package-lock.json') continue;
    const full = path.join(installed, entry);
    if (lstatSync(full).isSymbolicLink()) throw new Error(`Unexpected installed symlink: ${entry}`);
    if (lstatSync(full).isDirectory()) {
      for (const [name, hash] of Object.entries(artifactInventory(full)))
        actual[`${entry}/${name}`] = hash;
    } else actual[entry] = createHash('sha256').update(readFileSync(full)).digest('hex');
  }
  return compareArtifacts(artifactInventory(published), actual);
}
export function verifyInstalledArtifacts(
  consumers = ['EnsuredAPI', 'EnsuredUI', 'EnsuredNetwork/frontend'],
) {
  const temporary = mkdtempSync(path.join(tmpdir(), 'ensured-registry-verification-'));
  const artifacts = new Map();
  let checked = 0;
  try {
    for (const consumer of consumers) {
      const directory = path.resolve(root, consumer);
      const failures = checkConsumer(directory, true);
      if (failures.length) throw new Error(`${consumer}: ${failures.join('; ')}`);
      const lock = JSON.parse(readFileSync(path.join(directory, 'package-lock.json'), 'utf8'));
      // Include nested internal packages, since they may deliberately pin older versions.
      for (const [location, record] of Object.entries(lock.packages)) {
        if (!record.resolved?.startsWith('https://npm.pkg.github.com/')) continue;
        let published = artifacts.get(record.integrity);
        if (!published) {
          const result = JSON.parse(
            execFileSync(
              'npm',
              [
                'pack',
                record.resolved,
                '--ignore-scripts',
                '--json',
                '--pack-destination',
                temporary,
              ],
              {
                cwd: directory,
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'pipe'],
              },
            ),
          )[0];
          const archive = path.join(temporary, result.filename);
          if (!verifyIntegrity(readFileSync(archive), record.integrity))
            throw new Error(`Registry integrity mismatch: ${consumer}/${location}`);
          const entries = execFileSync('tar', ['-tzf', archive], {
            encoding: 'utf8',
          })
            .trim()
            .split('\n');
          if (
            entries.some(
              (entry) => !entry.startsWith('package/') || entry.split('/').includes('..'),
            )
          )
            throw new Error('Invalid package archive path');
          const extraction = mkdtempSync(path.join(temporary, 'artifact-'));
          execFileSync('tar', ['-xzf', archive, '-C', extraction]);
          published = path.join(extraction, 'package');
          artifacts.set(record.integrity, published);
        }
        const differences = comparePublishedFiles(published, path.join(directory, location));
        if (differences.length)
          throw new Error(
            `${consumer}/${location}: differs from locked registry artifact: ${differences.slice(0, 5).join(', ')}`,
          );
        checked++;
      }
    }
    console.log(
      `Verified ${checked} installed internal packages against ${artifacts.size} integrity-checked registry archives.`,
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifyInstalledArtifacts(process.argv.length > 2 ? process.argv.slice(2) : undefined);
}
