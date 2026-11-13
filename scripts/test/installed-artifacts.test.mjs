import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { verifyIntegrity, comparePublishedFiles } from '../verify-installed-artifacts.mjs';
test('rejects tampered archive bytes against the lockfile integrity', () => {
  const bytes = Buffer.from('published package');
  const integrity = `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
  assert.equal(verifyIntegrity(bytes, integrity), true);
  assert.equal(verifyIntegrity(Buffer.from('modified package'), integrity), false);
});
test('detects stale and extra installed files without treating nested dependencies as package files', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'installed-artifact-test-'));
  try {
    const published = path.join(root, 'published'),
      installed = path.join(root, 'installed');
    for (const dir of [published, installed]) {
      mkdirSync(dir);
      writeFileSync(path.join(dir, 'index.js'), 'published');
    }
    mkdirSync(path.join(installed, 'node_modules'));
    writeFileSync(path.join(installed, 'node_modules/dependency.js'), 'dependency');
    assert.deepEqual(comparePublishedFiles(published, installed), []);
    writeFileSync(path.join(installed, 'index.js'), 'stale');
    writeFileSync(path.join(installed, 'extra.js'), 'extra');
    assert.deepEqual(comparePublishedFiles(published, installed), ['extra.js', 'index.js']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
