import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';

export function packageEnvironment(directory, overrides = process.env) {
  const file = path.join(directory, '.env');
  return { ...(existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {}), ...overrides };
}

function localServer(host, port) {
  return ['localhost', '127.0.0.1', '::1', '[::1]', 'postgres', 'ensured-api-postgres', 'host.docker.internal'].includes(host.toLowerCase())
    && Number(port || 5432) === 5432;
}

function validName(value, key) {
  if (!value || value.includes('\0') || Buffer.byteLength(value) > 63)
    throw new Error(`${key}: database and role names must contain 1–63 bytes and no NUL.`);
  return value;
}

export function configuredDatabases(env, source) {
  const databases = [];
  const skipped = [];
  const covered = new Set();
  for (const [key, value] of Object.entries(env)) {
    if (!/^(?:.*_)?(?:DATABASE|DB)_URL$/.test(key) || !value) continue;
    let url;
    try { url = new URL(value); } catch { throw new Error(`${source}: ${key} is not a valid database URL.`); }
    if (!['postgres:', 'postgresql:'].includes(url.protocol))
      throw new Error(`${source}: ${key} must use postgres:// or postgresql://.`);
    const prefix = key.replace(/(?:DATABASE|DB)_URL$/, '');
    covered.add(prefix);
    // Query overrides would make the URL's apparent target ambiguous.
    if (['host', 'hostaddr', 'port', 'dbname', 'user', 'password'].some(k => url.searchParams.has(k)))
      throw new Error(`${source}: ${key} must put connection coordinates in the URL authority/path, not query parameters.`);
    if (!localServer(url.hostname, url.port)) { skipped.push(`${source}:${key}`); continue; }
    try {
      databases.push({ name: validName(decodeURIComponent(url.pathname.slice(1)), key),
        user: validName(decodeURIComponent(url.username), key), password: decodeURIComponent(url.password), source: `${source}:${key}` });
    } catch { throw new Error(`${source}: ${key} must contain valid encoded database/user names (1–63 bytes).`); }
  }
  for (const [key, value] of Object.entries(env)) {
    if (!/^(?:.*_)?(?:DB|DATABASE)_NAME$/.test(key) || !value) continue;
    const prefix = key.replace(/(?:DB|DATABASE)_NAME$/, '');
    if (covered.has(prefix)) continue;
    const stem = key.slice(0, -4);
    if (!localServer(env[`${stem}HOST`] || '127.0.0.1', env[`${stem}PORT`])) { skipped.push(`${source}:${key}`); continue; }
    databases.push({ name: validName(value, key), user: validName(env[`${stem}USER`] || 'postgres', key),
      password: env[`${stem}PASSWORD`] ?? 'postgres', source: `${source}:${key}` });
  }
  return { databases, skipped };
}

export function discoverDatabases(root, overrides = process.env) {
  const databases = new Map();
  const roles = new Map();
  const skipped = [];
  const packages = readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && existsSync(path.join(root, entry.name, 'package.json')))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(entry => ({ name: entry.name, env: packageEnvironment(path.join(root, entry.name), overrides) }));
  for (const entry of packages) {
    const env = { ...entry.env };
    // The former shared API file may retain service settings. A service's own
    // declaration supersedes that legacy copy; generic DB_* keys remain independent.
    if (entry.name === 'EnsuredAPI') {
      for (const key of Object.keys(env)) {
        if (/^.+_(?:DATABASE|DB)_(?:URL|NAME)$/.test(key)
          && packages.some(other => other.name !== entry.name && other.env[key])) delete env[key];
      }
    }
    if (entry.name === 'EnsuredAPI' && !env.DB_NAME && !env.DATABASE_URL && !env.DB_URL) env.DB_NAME = 'ensured_marketplace';
    const result = configuredDatabases(env, entry.name);
    skipped.push(...result.skipped);
    for (const database of result.databases) {
      const previous = databases.get(database.name);
      if (previous && previous.user !== database.user)
        throw new Error(`Conflicting owners for a database in ${previous.source} and ${database.source}.`);
      const role = roles.get(database.user);
      if (role && role.password !== database.password)
        throw new Error(`Conflicting role credentials in ${role.source} and ${database.source}.`);
      databases.set(database.name, database);
      roles.set(database.user, database);
    }
  }
  return { databases: [...databases.values()], skipped };
}

const literal = value => "'" + value.replaceAll("'", "''") + "'";
export function provisioningSql(databases) {
  const statements = ['SET standard_conforming_strings = on;', 'SELECT pg_advisory_lock(631902);'];
  const roles = new Set();
  for (const { name, user, password } of databases) {
    if (!roles.has(user)) {
      statements.push(`SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', ${literal(user)}, ${literal(password)}) WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = ${literal(user)})`, '\\gexec');
      roles.add(user);
    }
    statements.push(`SELECT format('CREATE DATABASE %I OWNER %I', ${literal(name)}, ${literal(user)}) WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = ${literal(name)})`, '\\gexec');
  }
  statements.push('SELECT pg_advisory_unlock(631902);');
  return statements.join('\n') + '\n';
}

// Preserve credentials, database names, and query options when moving local URLs into Docker.
export function dockerDatabaseEnvironment(env) {
  const result = {};
  for (const [key, value] of Object.entries(env)) {
    if (!/^(?:.*_)?(?:DATABASE|DB)_URL$/.test(key) || !value) continue;
    const url = new URL(value);
    if (['postgres:', 'postgresql:'].includes(url.protocol) && localServer(url.hostname, url.port)) {
      url.hostname = 'postgres';
      url.port = '5432';
    }
    result[key] = url.href;
  }
  return result;
}
