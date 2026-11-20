# Frontend agent

Unattended EnsuredUI delivery, one ticket per fresh Claude Code session.

| File                                                                                     | Role                                                                                            |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [`../../.claude/agents/frontend-engineer.md`](../../.claude/agents/frontend-engineer.md) | Agent definition: workflow, definition of done, hard rules                                      |
| [`run.sh`](run.sh)                                                                       | Outer loop: picks the next ticket, checks out its EnsuredUI branch, runs a session, re-verifies |
| [`gate.mjs`](gate.mjs)                                                                   | Definition-of-done gate: Stop hook (`--hook`) and post-session check (`<KEY>`)                  |
| [`guard.mjs`](guard.mjs)                                                                 | PreToolUse guard: protected paths, no push to main, no branch switching                         |
| [`settings.json`](settings.json)                                                         | Loaded only by `run.sh` via `--settings`; ordinary sessions are unaffected                      |
| [`queue.example.json`](queue.example.json)                                               | Queue format                                                                                    |

Runtime state lives in `/.frontend-agent/` (gitignored): `queue.json`, `logs/*.jsonl`
(stream-json transcripts), `gate/` and `evidence/<KEY>/`.

```sh
cp scripts/frontend-agent/queue.example.json .frontend-agent/queue.json   # then edit tickets
scripts/frontend-agent/run.sh --once        # one ticket
scripts/frontend-agent/run.sh               # drain the queue
scripts/frontend-agent/run.sh --prs         # also push the branch and open a PR per ticket
```

Statuses: `todo` → `in_progress` → `done` | `blocked`. The runner, not the agent, decides
whether `done` stands: it re-runs `gate.mjs` and returns the ticket to `todo` on failure. After
`FRONTEND_AGENT_MAX_ATTEMPTS` (default 3) attempts a ticket becomes `blocked`. Unfinished work is
checkpoint-committed on the ticket branch so the next attempt resumes from it.

Limits: runs are sequential in the main EnsuredUI checkout. For parallel tickets, give each its
own `git worktree` and `node_modules`. Jira updates depend on a Jira tool being available to
headless sessions; without one the agent records the gap instead of claiming it.
