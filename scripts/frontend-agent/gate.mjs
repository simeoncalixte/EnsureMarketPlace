#!/usr/bin/env node
// Definition-of-done gate for the frontend agent.
//
//   As a Claude Code Stop hook (reads hook JSON on stdin):
//     node scripts/frontend-agent/gate.mjs --hook
//   As a plain check (used by run.sh after each session):
//     node scripts/frontend-agent/gate.mjs <TICKET-KEY>
//
// The hook is inert unless FRONTEND_AGENT_TICKET is set, so loading it can never
// block an ordinary session.
//
// Checks, in EnsuredUI:
//   1. xds-audit on src files changed since the base branch (committed + uncommitted)
//   2. npm run check
//   3. if the ticket says "done": every evidence.storyResults file exists and has 0 failures
// Hook mode blocks the stop at most MAX_BLOCKS times per ticket, then lets the
// session end; run.sh re-runs the gate and will not accept a failing "done".

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const UI = join(ROOT, 'EnsuredUI');
const STATE = join(ROOT, '.frontend-agent');
const QUEUE = join(STATE, 'queue.json');
const BASE = process.env.FRONTEND_AGENT_BASE || 'main';
const MAX_BLOCKS = Number(process.env.FRONTEND_AGENT_MAX_GATE_BLOCKS || 3);

const hookMode = process.argv.includes('--hook');
const ticketKey = hookMode
  ? process.env.FRONTEND_AGENT_TICKET
  : process.argv.find((a, i) => i > 1 && !a.startsWith('--'));

if (hookMode) {
  try {
    readFileSync(0, 'utf8'); // drain stdin; we key off env, not the payload
  } catch {
    /* no stdin */
  }
  if (!ticketKey) process.exit(0);
}
if (!ticketKey) {
  console.error('usage: gate.mjs <TICKET-KEY> | --hook');
  process.exit(2);
}

const git = (...args) => execFileSync('git', ['-C', UI, ...args], { encoding: 'utf8' }).trim();

function changedSrcFiles() {
  const committed = git('diff', '--name-only', '--diff-filter=AM', `${BASE}...HEAD`, '--', 'src');
  const working = git('diff', '--name-only', '--diff-filter=AM', 'HEAD', '--', 'src');
  const untracked = git('ls-files', '--others', '--exclude-standard', '--', 'src');
  return [
    ...new Set([committed, working, untracked].join('\n').split('\n').filter(Boolean)),
  ].filter((f) => /\.(tsx?|jsx?|css)$/.test(f) && existsSync(join(UI, f)));
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: UI, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  return { ok: r.status === 0, tail: out.split('\n').slice(-40).join('\n') };
}

function ticket() {
  if (!existsSync(QUEUE)) return null;
  const q = JSON.parse(readFileSync(QUEUE, 'utf8'));
  return q.tickets.find((t) => t.key === ticketKey) ?? null;
}

const problems = [];

const files = changedSrcFiles();
if (files.length) {
  const audit = run('node', ['.agents/skills/ui-engineer/scripts/xds-audit.mjs', ...files]);
  if (!audit.ok) problems.push(`xds-audit failed on changed files:\n${audit.tail}`);
}

const check = run('npm', ['run', 'check']);
if (!check.ok) problems.push(`npm run check failed in EnsuredUI:\n${check.tail}`);

const t = ticket();
if (t?.status === 'done') {
  const results = t.evidence?.storyResults ?? [];
  if (!results.length) problems.push('Ticket is "done" but evidence.storyResults is empty.');
  for (const rel of results) {
    const p = resolve(ROOT, rel);
    if (!existsSync(p)) {
      problems.push(`Missing story results file: ${rel}`);
      continue;
    }
    const s = JSON.parse(readFileSync(p, 'utf8'));
    if (!(s.passed > 0) || s.failed !== 0)
      problems.push(`Story run ${rel} has ${s.passed} passed / ${s.failed} failed.`);
  }
  if (!(t.evidence?.afterShots ?? []).length)
    problems.push(
      'Ticket is "done" but evidence.afterShots is empty (record "n/a: <reason>" if no visual change).',
    );
}

if (!hookMode) {
  if (problems.length) {
    console.log(`GATE FAIL ${ticketKey}\n\n${problems.join('\n\n')}`);
    process.exit(1);
  }
  console.log(`GATE PASS ${ticketKey} (${files.length} changed src files audited)`);
  process.exit(0);
}

// Hook mode: block the stop with the reasons, a bounded number of times.
const counterFile = join(STATE, 'gate', `${ticketKey}.blocks`);
mkdirSync(dirname(counterFile), { recursive: true });
const blocks = existsSync(counterFile) ? Number(readFileSync(counterFile, 'utf8')) : 0;

if (problems.length && blocks < MAX_BLOCKS) {
  writeFileSync(counterFile, String(blocks + 1));
  process.stdout.write(
    JSON.stringify({
      decision: 'block',
      reason:
        `Definition-of-done gate failed (attempt ${blocks + 1}/${MAX_BLOCKS}). Fix these, or if ` +
        `you are genuinely blocked set the ticket to "blocked" with the reason in notes:\n\n` +
        problems.join('\n\n'),
    }),
  );
}
process.exit(0);
