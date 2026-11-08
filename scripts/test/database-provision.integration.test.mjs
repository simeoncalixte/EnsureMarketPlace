import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { provisioningSql } from '../database-config.mjs';

test('provisions roles and quoted databases, preserves data and existing passwords on repeat runs',
  { skip: process.env.DATABASE_DOCKER_TEST !== '1', timeout: 60000 }, async () => {
    const container = `ensured-db-provision-test-${randomUUID()}`;
    const database = { name: 'test db\'";', user: 'test role\'"', password: 'test p\'@\\word' };
    function docker(args, options = {}) {
      const result = spawnSync('docker', args, { encoding: 'utf8', timeout: 20000, ...options });
      assert.equal(result.status, 0, `Docker ${args[0]} failed: ${result.stderr}`);
      return result.stdout;
    }
    function provision() {
      docker(['exec', '-i', container, 'psql', '-X', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'],
        { input: provisioningSql([database]) });
    }
    function query(sql) {
      return docker(['exec', '-i', '-e', 'PGPASSWORD', container, 'psql', '-X', '-h', '127.0.0.1',
        '-U', database.user, '-d', database.name, '-v', 'ON_ERROR_STOP=1', '-At'],
      { input: sql, env: { ...process.env, PGPASSWORD: database.password } }).trim();
    }
    try {
      docker(['run', '-d', '--name', container, '--tmpfs', '/var/lib/postgresql/data',
        '-e', 'POSTGRES_PASSWORD=isolated-test-only', 'postgres:16-alpine']);
      let ready = false;
      for (let i = 0; i < 60; i++) {
        const result = spawnSync('docker', ['exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres'], {stdio:'ignore'});
        if (result.status === 0) { ready = true; break; }
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      assert.ok(ready, 'isolated PostgreSQL became ready');
      provision();
      query('CREATE TABLE retained (value text); INSERT INTO retained VALUES (\'keep\');');
      provision();
      assert.equal(query('SELECT value FROM retained;'), 'keep');
      docker(['exec', '-i', container, 'psql', '-X', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'],
        { input: provisioningSql([{...database, password:'different'}]) });
      assert.equal(query('SELECT value FROM retained;'), 'keep');
    } finally {
      spawnSync('docker', ['rm', '-f', container], {stdio:'ignore', timeout:20000});
    }
  });
