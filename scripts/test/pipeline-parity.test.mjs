import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { artifactInventory, compareArtifacts, verifyOwnership, verifyPin } from '../verify-pipeline-parity.mjs';
test('same-version stale JS, declarations, JSON, missing and extra files fail parity', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'pipeline-parity-'));
  try {
    for (const name of ['source', 'installed']) {
      mkdirSync(path.join(dir, name));
      for (const file of ['model.js', 'model.d.ts', 'policy.json']) writeFileSync(path.join(dir, name, file), 'original');
    }
    const expected = artifactInventory(path.join(dir, 'source'));
    assert.deepEqual(compareArtifacts(expected, artifactInventory(path.join(dir, 'installed'))), []);
    for (const file of Object.keys(expected)) {
      writeFileSync(path.join(dir, 'installed', file), 'stale');
      assert.deepEqual(compareArtifacts(expected, artifactInventory(path.join(dir, 'installed'))), [file]);
      writeFileSync(path.join(dir, 'installed', file), 'original');
    }
    rmSync(path.join(dir, 'installed/model.js'));
    writeFileSync(path.join(dir, 'installed/obsolete.js'), 'old');
    assert.deepEqual(compareArtifacts(expected, artifactInventory(path.join(dir, 'installed'))), ['model.js', 'obsolete.js']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('missing owners and replacement files cannot be silently skipped', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'pipeline-ownership-'));
  try {
    mkdirSync(path.join(dir, 'Owner'));
    writeFileSync(path.join(dir, 'Owner/new.ts'), 'export const value = 1;');
    const manifest = { packages: [{directory:'Owner',name:'owner'}], files: { new: {directory:'Owner',package:'owner',path:'new.ts'} }, retiredFiles: { old: {directory:'Owner',path:'old.ts',reason:'Replaced in reviewed commit',replacements:['new.ts']} } };
    assert.deepEqual(verifyOwnership(dir, manifest), []);
    rmSync(path.join(dir, 'Owner/new.ts'));
    assert.equal(verifyOwnership(dir, manifest).length, 2);
    writeFileSync(path.join(dir, 'Owner/old.ts'), 'stale');
    assert.match(verifyOwnership(dir, manifest).join('\n'), /Retired source reappeared/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('release consumers require exact version and registry integrity; links and ranges fail', () => {
  const name = '@example/shared', version = '1.0.0';
  const consumer = {dependencies:{[name]:version}};
  const lock = {packages:{'':{dependencies:{[name]:version}},[`node_modules/${name}`]:{version,integrity:'sha512-test',resolved:'https://npm.pkg.github.com/download/shared/1.0.0/hash'}}};
  assert.deepEqual(verifyPin(name, version, consumer, lock), []);
  consumer.dependencies[name] = '^1.0.0';
  assert.equal(verifyPin(name, version, consumer, lock).length, 1);
  consumer.dependencies[name] = version;
  lock.packages[`node_modules/${name}`].link = true;
  assert.equal(verifyPin(name, version, consumer, lock).length, 1);
  delete lock.packages[`node_modules/${name}`].link;
  lock.packages[`node_modules/${name}`].version = '0.9.0';
  assert.equal(verifyPin(name, version, consumer, lock).length, 1);
});

test('release gate resolves consumer artifacts and rejects a stale package at the same version', async () => {
  const { verifyRelease } = await import('../verify-pipeline-parity.mjs');
  const dir = mkdtempSync(path.join(tmpdir(), 'pipeline-release-'));
  const write = (file, value) => { mkdirSync(path.dirname(file), {recursive:true}); writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)); };
  try {
    const packages = ['shared','capacity','riskCompute'].map(key => ({key,name:`@fixture/${key}`,directory:key}));
    write(path.join(dir,'pipeline-packages.json'), {packages,files:{}});
    const dependencies = Object.fromEntries(packages.map(p => [p.name,'1.0.0']));
    const lock = {packages:{'':{dependencies}}};
    write(path.join(dir,'EnsuredAPI/package.json'),{dependencies});
    for (const pkg of packages) {
      write(path.join(dir,pkg.directory,'package.json'), {name:pkg.name,version:'1.0.0',scripts:{build:'node build.cjs'}});
      write(path.join(dir,pkg.directory,'source.js'),'exports.value = 1;');
      write(path.join(dir,pkg.directory,'build.cjs'), "const fs=require('node:fs');fs.mkdirSync('dist',{recursive:true});fs.copyFileSync('source.js','dist/index.js');");
      const installed = path.join(dir,'EnsuredAPI/node_modules',pkg.name);
      write(path.join(installed,'package.json'),{name:pkg.name,version:'1.0.0'});
      write(path.join(installed,'dist/index.js'),'exports.value = 1;');
      lock.packages[`node_modules/${pkg.name}`]={version:'1.0.0',resolved:'https://npm.pkg.github.com/download/fixture',integrity:'sha512-fixture'};
    }
    write(path.join(dir,'EnsuredAPI/package-lock.json'),lock);
    assert.deepEqual(verifyRelease(dir),[]);
    write(path.join(dir,'EnsuredAPI/node_modules/@fixture/riskCompute/dist/index.js'),'exports.value = 0;');
    assert.match(verifyRelease(dir).join('\n'),/stale @fixture\/riskCompute@1.0.0/);
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
