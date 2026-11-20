#!/usr/bin/env node
// PreToolUse guard for the frontend agent. Denies:
//   - edits to env files, node_modules, the installed XDS package, and the agent's own gate
//   - git push to main/master, force pushes, and branch switching in EnsuredUI
// Inert unless FRONTEND_AGENT_TICKET is set.

import { readFileSync } from 'node:fs';

if (!process.env.FRONTEND_AGENT_TICKET) process.exit(0);

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
const tool = input.tool_name;
const ti = input.tool_input ?? {};

const deny = (reason) => {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
};

const protectedPath = (p = '') =>
  /(^|\/)\.env(\.|$)/.test(p) ||
  /(^|\/)node_modules\//.test(p) ||
  /(^|\/)scripts\/frontend-agent\//.test(p) ||
  /(^|\/)\.claude\/agents\/frontend-engineer\.md$/.test(p);

if (['Edit', 'Write', 'NotebookEdit'].includes(tool)) {
  const p = ti.file_path ?? ti.notebook_path;
  if (protectedPath(p)) deny(`Frontend agent may not modify ${p}.`);
}

if (tool === 'Bash') {
  const cmd = String(ti.command ?? '');
  if (/git\b[^|;&]*\bpush\b[^|;&]*(--force|-f\b|\+)/.test(cmd)) deny('Force push is not allowed.');
  if (/git\b[^|;&]*\bpush\b[^|;&]*\b(main|master)\b/.test(cmd))
    deny('Pushing to main is not allowed.');
  if (process.env.FRONTEND_AGENT_PRS !== '1' && /git\b[^|;&]*\bpush\b|gh\s+pr\s+create/.test(cmd))
    deny('PRs are disabled for this run; commit locally and stop.');
  // Allow `git checkout -- <file>` / `git checkout HEAD -- <file>` (restores); deny branch switches.
  if (/\bgit\b[^|;&]*\b(switch|checkout)\b/.test(cmd) && !/\bcheckout\s+(HEAD\s+)?--\s/.test(cmd))
    deny('Do not switch branches; the runner manages branches.');
  if (/\brm\s+-[a-z]*r[a-z]*f?\b[^|;&]*(\s\/|\s~|\s\.\.?(\s|$))/.test(cmd))
    deny('Broad recursive delete blocked.');
  if (/(^|[\s;&|])(cat|sed|awk|head|tail|less|grep)\b[^|;&]*\.env\b/.test(cmd))
    deny('Reading env files is not allowed.');
}

process.exit(0);
