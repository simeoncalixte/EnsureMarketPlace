import { AsyncLocalStorage } from 'async_hooks';

/**
 * Agent-call tracing — the observability seam for the pipeline's LLM agents.
 *
 * Every Gemini invocation (via `invokeAgentText` in ./gemini.ts) records the
 * exact prompt it sent and the raw model text it got back. The board's stage
 * executor opens a capture around the stage runner; any agent call made inside
 * that async context lands in the capture, which the executor then persists as
 * `agent_traces` rows next to the stage execution. The UI renders these as a
 * ChatGPT-style transcript so a reviewer can verify what the agent was asked
 * and what it answered.
 *
 * Capture is strictly additive: with no active capture (tests, ad-hoc calls
 * outside the board) `startAgentCall` returns null and tracing is a no-op.
 *
 * A module-level live registry mirrors the open captures keyed by submission,
 * so the activity endpoint can show calls that are still in flight ("the agent
 * is thinking") before anything reaches the database.
 */

export type AgentCallStatus = 'running' | 'completed' | 'failed';

export type AgentCallTrace = {
  /** 1-based order of the call within its stage run. */
  seq: number;
  /** Which agent made the call, e.g. 'lob_classification', 'extraction'. */
  agent: string;
  model: string;
  promptVersion: string | null;
  /** The full prompt text sent to the model (truncated at MAX_TRACE_CHARS). */
  prompt: string;
  /** The raw model response text (truncated at MAX_TRACE_CHARS). */
  responseText: string | null;
  status: AgentCallStatus;
  errorMessage: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  durationMs: number | null;
};

type CaptureStore = {
  submissionId: number | null;
  stageKey: string | null;
  traces: AgentCallTrace[];
};

/** Cap stored prompt/response text — enough to read, never a runaway payload. */
export const MAX_TRACE_CHARS = 20000;

const storage = new AsyncLocalStorage<CaptureStore>();

/** Open captures by submission id — the "what is happening right now" view. */
const liveCaptures = new Map<number, Set<CaptureStore>>();

export interface AgentTraceCapture {
  /** Run `fn` with this capture active; agent calls inside it are recorded. */
  run<T>(fn: () => Promise<T>): Promise<T>;
  /** The calls recorded so far (also mutated live while `run` is in flight). */
  readonly traces: AgentCallTrace[];
}

/**
 * Create a capture scoped to one stage run. The capture is registered in the
 * live view for the duration of `run` and must be read (and persisted) by the
 * caller afterwards — including when `fn` throws, since a failed agent call is
 * exactly what a reviewer wants to see.
 */
export function createAgentTraceCapture(context: {
  submissionId?: number | null;
  stageKey?: string | null;
}): AgentTraceCapture {
  const store: CaptureStore = {
    submissionId: context.submissionId ?? null,
    stageKey: context.stageKey ?? null,
    traces: [],
  };
  return {
    traces: store.traces,
    async run<T>(fn: () => Promise<T>): Promise<T> {
      const key = store.submissionId;
      if (key != null) {
        const open = liveCaptures.get(key) ?? new Set<CaptureStore>();
        open.add(store);
        liveCaptures.set(key, open);
      }
      try {
        return await storage.run(store, fn);
      } finally {
        if (key != null) {
          const open = liveCaptures.get(key);
          open?.delete(store);
          if (open && open.size === 0) liveCaptures.delete(key);
        }
      }
    },
  };
}

function clip(text: string): string {
  return text.length > MAX_TRACE_CHARS
    ? `${text.slice(0, MAX_TRACE_CHARS)}\n… [truncated at ${MAX_TRACE_CHARS} characters]`
    : text;
}

/**
 * Record the start of an agent call in the active capture. Returns the live
 * trace entry to settle, or null when no capture is active (tracing off).
 */
export function startAgentCall(args: {
  agent: string;
  model: string;
  promptVersion?: string | null;
  prompt: string;
}): AgentCallTrace | null {
  const store = storage.getStore();
  if (!store) return null;
  const trace: AgentCallTrace = {
    seq: store.traces.length + 1,
    agent: args.agent,
    model: args.model,
    promptVersion: args.promptVersion ?? null,
    prompt: clip(args.prompt),
    responseText: null,
    status: 'running',
    errorMessage: null,
    startedAt: new Date(),
    finishedAt: null,
    durationMs: null,
  };
  store.traces.push(trace);
  return trace;
}

/** Settle a call started with {@link startAgentCall} as completed or failed. */
export function settleAgentCall(
  trace: AgentCallTrace | null,
  outcome: { responseText?: string | null; errorMessage?: string | null },
): void {
  if (!trace) return;
  trace.finishedAt = new Date();
  trace.durationMs = Math.max(0, trace.finishedAt.getTime() - trace.startedAt.getTime());
  trace.responseText = outcome.responseText != null ? clip(outcome.responseText) : null;
  trace.errorMessage = outcome.errorMessage ?? null;
  trace.status = outcome.errorMessage ? 'failed' : 'completed';
}

/**
 * In-flight agent calls for a submission (stages currently running), for the
 * live activity view. Returns plain copies — callers must not mutate captures.
 */
export function liveAgentCalls(submissionId: number): Array<AgentCallTrace & { stageKey: string | null }> {
  const open = liveCaptures.get(submissionId);
  if (!open) return [];
  const calls: Array<AgentCallTrace & { stageKey: string | null }> = [];
  for (const store of open) {
    for (const trace of store.traces) {
      calls.push({ ...trace, stageKey: store.stageKey });
    }
  }
  return calls;
}
