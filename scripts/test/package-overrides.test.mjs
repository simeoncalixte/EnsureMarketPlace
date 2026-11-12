import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { checkConsumer } from '../check-package-overrides.mjs';
test('rejects a same-version source link even when its lock claims a registry artifact', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'registry-only-'));
  const app = path.join(root, 'app'), owner = path.join(root, 'owner');
  const name = '@ensured/fixture';
  const write = (file, value) => { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, JSON.stringify(value)); };
  try {
    write(path.join(app, 'package.json'), { dependencies: { [name]: '1.0.0' } });
    write(path.join(app, 'package-lock.json'), { packages: { '': { dependencies: { [name]: '1.0.0' } }, [`node_modules/${name}`]: { version: '1.0.0', resolved: 'https://npm.pkg.github.com/fixture', integrity: 'sha512-fixture' } } });
    write(path.join(owner, 'package.json'), { name, version: '1.0.0' });
    mkdirSync(path.join(app, 'node_modules/@ensured'), { recursive: true });
    const target = path.join(app, 'node_modules', name);
    symlinkSync(owner, target, 'dir');
    assert.match(checkConsumer(app, true).join('\n'), /installed source link/);
    rmSync(target);
    write(path.join(target, 'package.json'), { name, version: '1.0.0' });
    assert.deepEqual(checkConsumer(app, true), []);
    write(path.join(app, 'package-lock.json'), { packages: {} });
    assert.match(checkConsumer(app).join('\n'), /missing locked registry artifact/);
    write(path.join(app, 'package-lock.json'), { packages: { [`node_modules/${name}`]: { version: '1.0.0', resolved: 'file:../owner' } } });
    assert.match(checkConsumer(app).join('\n'), /missing registry URL or integrity/);
    write(path.join(app, 'package.json'), { dependencies: { [name]: '1.0.1' } });
    assert.match(checkConsumer(app, true).join('\n'), /lockfile artifact differs/);
    write(path.join(app, 'package.json'), { dependencies: { [name]: 'file:../owner' } });
    assert.match(checkConsumer(app).join('\n'), /local dependency/);
    write(path.join(app, 'package-lock.json'), { packages: { [`node_modules/${name}`]: { resolved: '../owner', link: true } } });
    assert.match(checkConsumer(app).join('\n'), /local lockfile/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
