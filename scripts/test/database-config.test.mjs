import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { configuredDatabases, discoverDatabases, dockerDatabaseEnvironment, packageEnvironment, provisioningSql } from '../database-config.mjs';

test('discovers URL and split settings, with URL precedence and decoded credentials', () => {
  const { databases } = configuredDatabases({
    NETWORK_DATABASE_URL: 'postgresql://role%20one:p%40ss%27word@localhost:5432/network%20one?sslmode=disable',
    NETWORK_DB_NAME: 'ignored',
    DB_NAME: 'market', DB_USER: 'postgres', DB_PASSWORD: 'local',
    NEW_DB_NAME: 'new', NEW_DB_USER: 'new_role', NEW_DB_PASSWORD: 'new_password',
  }, 'service');
  assert.deepEqual(databases.map(({name,user,password}) => ({name,user,password})), [
    {name:'network one',user:'role one',password:"p@ss'word"},
    {name:'market',user:'postgres',password:'local'},
    {name:'new',user:'new_role',password:'new_password'},
  ]);
});

test('only provisions the shared local server', () => {
  const result = configuredDatabases({
    REMOTE_DATABASE_URL: 'postgres://user:secret@production.example/db',
    TEST_DATABASE_URL: 'postgres://user:secret@localhost:5546/test',
    DB_NAME: 'other', DB_HOST: 'remote',
  }, 'service');
  assert.equal(result.databases.length, 0);
  assert.equal(result.skipped.length, 3);
});

test('rejects malformed URLs, ambiguous query targets and oversized identifiers without leaking secrets', () => {
  for (const value of ['postgres://secret@', 'mysql://user:secret@localhost/db',
    'postgres://user:secret@localhost/db?host=remote', 'postgres://user:secret@localhost/',
    `postgres://user:secret@localhost/${'é'.repeat(32)}`, 'postgres://user:secret@localhost/%00']) {
    assert.throws(() => configuredDatabases({DATABASE_URL:value}, 'service'), error => !error.message.includes('secret'));
  }
});

test('Docker rewriting changes only local host and port and preserves encoded URL components/options', () => {
  const result = dockerDatabaseEnvironment({NETWORK_DATABASE_URL:'postgresql://u:p%40ss@127.0.0.1/n%20one?sslmode=disable',
    OTHER_DATABASE_URL:'postgres://u:p@remote/db'});
  assert.equal(result.NETWORK_DATABASE_URL, 'postgresql://u:p%40ss@postgres:5432/n%20one?sslmode=disable');
  assert.equal(result.OTHER_DATABASE_URL, 'postgres://u:p@remote/db');
});

test('reads package-local files, prioritizes injected variables, discovers new packages and rejects conflicts', t => {
  const root = mkdtempSync(path.join(tmpdir(), 'ensured-db-config-'));
  t.after(() => rmSync(root, {recursive:true,force:true}));
  function pkg(name, env) {
    mkdirSync(path.join(root,name), {recursive:true});
    writeFileSync(path.join(root,name,'package.json'), '{}');
    writeFileSync(path.join(root,name,'.env'), env);
  }
  pkg('EnsuredAPI', 'DB_NAME=market\nNETWORK_DATABASE_URL=postgres://old:old@localhost/network\n');
  pkg('EnsuredNetwork', 'NETWORK_DATABASE_URL="postgres://network:pass@localhost/network"\n');
  pkg('BrandNew', 'DB_NAME=new\nDB_USER=new\nDB_PASSWORD=new\n');
  assert.equal(packageEnvironment(path.join(root,'BrandNew'), {DB_NAME:'shell'}).DB_NAME, 'shell');
  assert.deepEqual(discoverDatabases(root, {}).databases.map(d => d.name).sort(), ['market','network','new']);
  pkg('Conflict', 'DB_NAME=network\nDB_USER=wrong\n');
  assert.throws(() => discoverDatabases(root, {}), /Conflicting owners/);
  pkg('Conflict', 'DB_NAME=different\nDB_USER=network\nDB_PASSWORD=different\n');
  assert.throws(() => discoverDatabases(root, {}), /Conflicting role credentials/);
});

test('SQL quotes identifiers through PostgreSQL format and never alters or drops existing objects', () => {
  const sql = provisioningSql([{name:"odd'\";database",user:"role'\"",password:"p'ass\\word"}]);
  assert.match(sql, /format\('CREATE DATABASE %I OWNER %I'/);
  assert.match(sql, /format\('CREATE ROLE %I LOGIN PASSWORD %L'/);
  assert.match(sql, /odd''";database/);
  assert.match(sql, /WHERE NOT EXISTS/);
  assert.doesNotMatch(sql, /ALTER |DROP /);
  assert.match(sql, /pg_advisory_lock/);
});
