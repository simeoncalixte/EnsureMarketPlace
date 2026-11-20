#!/usr/bin/env bash
# Long-running frontend agent: works through .frontend-agent/queue.json one ticket per
# fresh Claude Code session, on its own EnsuredUI branch, gated by gate.mjs.
#
#   scripts/frontend-agent/run.sh                 # run until the queue has no "todo" tickets
#   scripts/frontend-agent/run.sh --once          # one ticket, then exit
#   scripts/frontend-agent/run.sh --prs           # also let the agent push its branch and open a PR
#
# Env: CLAUDE_BIN (default: claude on PATH, else the VS Code extension binary)
#      FRONTEND_AGENT_BUDGET_USD (per session, default 15)
#      FRONTEND_AGENT_MAX_ATTEMPTS (per ticket, default 3)
#      FRONTEND_AGENT_BASE (base branch, default main)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
UI="$ROOT/EnsuredUI"
STATE="$ROOT/.frontend-agent"
QUEUE="$STATE/queue.json"
BASE="${FRONTEND_AGENT_BASE:-main}"
BUDGET="${FRONTEND_AGENT_BUDGET_USD:-15}"
MAX_ATTEMPTS="${FRONTEND_AGENT_MAX_ATTEMPTS:-3}"
ONCE=0; PRS=0
for a in "$@"; do
  case "$a" in
    --once) ONCE=1 ;;
    --prs) PRS=1 ;;
    *) echo "unknown option: $a" >&2; exit 2 ;;
  esac
done

if [[ -z "${CLAUDE_BIN:-}" ]]; then
  if command -v claude >/dev/null; then CLAUDE_BIN=claude
  else CLAUDE_BIN="$(ls -d "$HOME"/.vscode/extensions/anthropic.claude-code-*/resources/native-binary/claude 2>/dev/null | tail -1)"
  fi
fi
[[ -x "$CLAUDE_BIN" ]] || command -v "$CLAUDE_BIN" >/dev/null || { echo "Claude CLI not found; set CLAUDE_BIN" >&2; exit 1; }
[[ -f "$QUEUE" ]] || { echo "No queue at $QUEUE — copy scripts/frontend-agent/queue.example.json there" >&2; exit 1; }

mkdir -p "$STATE/logs" "$STATE/gate" "$STATE/evidence"

set_ticket() { # set_ticket KEY jq-expression
  local tmp; tmp="$(mktemp)"
  jq --arg k "$1" "(.tickets[] | select(.key == \$k)) |= ($2)" "$QUEUE" >"$tmp" && mv "$tmp" "$QUEUE"
}
field() { jq -r --arg k "$1" ".tickets[] | select(.key == \$k) | $2" "$QUEUE"; }

while :; do
  KEY="$(jq -r '[.tickets[] | select(.status == "todo" or .status == "in_progress")][0].key // empty' "$QUEUE")"
  [[ -n "$KEY" ]] || { echo "Queue has no todo tickets. Done."; break; }

  ATTEMPTS="$(field "$KEY" '.attempts // 0')"
  if (( ATTEMPTS >= MAX_ATTEMPTS )); then
    set_ticket "$KEY" '.status = "blocked" | .notes = ((.notes // "") + "\n[runner] max attempts reached")'
    echo "[$KEY] blocked after $ATTEMPTS attempts"; continue
  fi

  # Tracked changes in EnsuredUI would leak into the agent's commits.
  if ! git -C "$UI" diff --quiet HEAD; then
    echo "EnsuredUI has uncommitted tracked changes; commit or stash them first:" >&2
    git -C "$UI" status --short >&2; exit 1
  fi

  BRANCH="$(field "$KEY" '.branch // empty')"
  if [[ -z "$BRANCH" ]]; then
    SLUG="$(field "$KEY" '.summary' | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | cut -c1-40 | sed 's/-$//')"
    BRANCH="feat/$(echo "$KEY" | tr '[:upper:]' '[:lower:]')-$SLUG"
    git -C "$UI" fetch --quiet origin "$BASE" || true
    git -C "$UI" branch "$BRANCH" "$BASE" 2>/dev/null || true
    set_ticket "$KEY" ".branch = \"$BRANCH\""
  fi
  git -C "$UI" checkout --quiet "$BRANCH"

  set_ticket "$KEY" '.status = "in_progress" | .attempts = ((.attempts // 0) + 1)'
  rm -f "$STATE/gate/$KEY.blocks"
  LOG="$STATE/logs/$KEY-$(date +%Y%m%d-%H%M%S).jsonl"
  echo "[$KEY] attempt $((ATTEMPTS + 1)) on $BRANCH → $LOG"

  PROMPT="You are running unattended as the frontend agent. Your ticket is $KEY.
Resume from TASK_HANDOFF.md and the $KEY entry in .frontend-agent/queue.json (attempt $((ATTEMPTS + 1)) of $MAX_ATTEMPTS).
Work on EnsuredUI branch $BRANCH. PRs are $([[ $PRS == 1 ]] && echo "ENABLED: when done, push the branch and open a PR against $BASE" || echo "DISABLED: commit locally only").
Complete the ticket to your definition of done, update the queue entry and TASK_HANDOFF.md, then stop."

  set +e
  FRONTEND_AGENT_TICKET="$KEY" FRONTEND_AGENT_PRS="$PRS" FRONTEND_AGENT_BASE="$BASE" \
    "$CLAUDE_BIN" -p "$PROMPT" \
      --agent frontend-engineer \
      --settings "$ROOT/scripts/frontend-agent/settings.json" \
      --permission-mode acceptEdits \
      --max-budget-usd "$BUDGET" \
      --output-format stream-json --verbose \
      >"$LOG" 2>&1
  CODE=$?
  set -e
  echo "[$KEY] session exited $CODE"

  # Never trust the agent's own status: re-run the gate.
  STATUS="$(field "$KEY" '.status')"
  if [[ "$STATUS" == "done" ]]; then
    if FRONTEND_AGENT_BASE="$BASE" node "$ROOT/scripts/frontend-agent/gate.mjs" "$KEY" >"$STATE/gate/$KEY.last" 2>&1; then
      echo "[$KEY] DONE (gate passed)"
    else
      echo "[$KEY] claimed done but gate failed; returning to todo"; cat "$STATE/gate/$KEY.last"
      set_ticket "$KEY" '.status = "todo" | .notes = ((.notes // "") + "\n[runner] gate rejected done; see .frontend-agent/gate/'"$KEY"'.last")'
    fi
  elif [[ "$STATUS" == "in_progress" ]]; then
    set_ticket "$KEY" '.status = "todo"'
  fi

  # Keep unfinished work on the ticket branch so the next attempt resumes from it.
  if ! git -C "$UI" diff --quiet HEAD || [[ -n "$(git -C "$UI" ls-files --others --exclude-standard -- src)" ]]; then
    git -C "$UI" add -u
    git -C "$UI" add -- src 2>/dev/null || true
    git -C "$UI" commit --quiet -m "$KEY: WIP checkpoint (frontend-agent runner)" || true
  fi
  git -C "$UI" checkout --quiet "$BASE"
  (( ONCE )) && break
done
