/**
 * Shared helpers for the pipeline's LangChain → Gemini agents.
 *
 * The judgment stages (classification, extraction, validation, workflow) use a
 * Gemini model as their PRIMARY implementation, with their deterministic
 * heuristic kept only as a fallback (no key / call fails). These helpers
 * centralize the Gemini config (model, timeout, key gating), client creation,
 * and the message/JSON coercion every agent needs.
 *
 * Config (shared with the OCR Gemini-vision provider):
 *   GEMINI_API_KEY     required — its presence makes an agent "available"
 *   GEMINI_MODEL       default: gemini-2.5-flash
 *   GEMINI_TIMEOUT_MS  default: 8000 (stages may define their own override
 *                      var + default via `geminiTimeoutMs`, e.g. extraction's
 *                      GEMINI_EXTRACTION_TIMEOUT_MS — enumerating a 200-item
 *                      SOV needs far more than a one-code classification)
 */

import { settleAgentCall, startAgentCall } from './trace';

/** An agent is available (LLM is the primary path) when a Gemini key is set. */
export function isGeminiConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.GEMINI_API_KEY);
}

export function geminiModel(env: NodeJS.ProcessEnv = process.env): string {
  return env.GEMINI_MODEL ?? 'gemini-2.5-flash';
}

/**
 * Per-call timeout. A stage with a bigger task may pass its own env override
 * var and default: `geminiTimeoutMs(env, 'GEMINI_EXTRACTION_TIMEOUT_MS', 20000)`
 * resolves stage var → shared GEMINI_TIMEOUT_MS → stage default.
 */
export function geminiTimeoutMs(
  env: NodeJS.ProcessEnv = process.env,
  stageEnvKey?: string,
  stageDefaultMs?: number,
): number {
  const stageValue = stageEnvKey ? env[stageEnvKey] : undefined;
  if (stageValue !== undefined && stageValue !== '') return Number(stageValue);
  if (env.GEMINI_TIMEOUT_MS !== undefined && env.GEMINI_TIMEOUT_MS !== '') return Number(env.GEMINI_TIMEOUT_MS);
  return stageDefaultMs ?? 8000;
}

/**
 * Create a configured ChatGoogleGenerativeAI client (lazy import so the app
 * loads without the SDK until an agent actually runs). `json: true` forces a
 * JSON-only response (supported on gemini-1.5+), which the structured agents use.
 *
 * `maxRetries: 1` — a single transient 429/5xx must not silently demote a
 * judgment stage to its heuristic fallback; one retry (LangChain backoff) is
 * cheap insurance. The per-call `timeout` still bounds total latency.
 */
export async function createGeminiChat(
  env: NodeJS.ProcessEnv = process.env,
  opts: { json?: boolean } = {},
): Promise<any> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('createGeminiChat: GEMINI_API_KEY is not set');
  const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
  return new ChatGoogleGenerativeAI({
    apiKey,
    model: geminiModel(env),
    temperature: 0,
    maxRetries: 1,
    ...(opts.json ? { json: true } : {}),
  });
}

/** Best-effort projection of a LangChain prompt (string | messages[]) to text. */
function promptToText(messages: unknown): string {
  if (typeof messages === 'string') return messages;
  if (Array.isArray(messages)) {
    return messages
      .map((message) => {
        if (typeof message === 'string') return message;
        const m = message as { role?: unknown; content?: unknown };
        const role = typeof m?.role === 'string' ? m.role : null;
        const text = messageText(m?.content);
        return role ? `[${role}]\n${text}` : text;
      })
      .filter(Boolean)
      .join('\n\n');
  }
  return messageText((messages as { content?: unknown })?.content);
}

/**
 * Invoke a Gemini chat and return the response TEXT, recording the call (prompt
 * sent, raw response, timing, failure) in the active agent-trace capture so the
 * pipeline UI can show what the agent was asked and what it answered. This is
 * the one choke point every pipeline agent calls through — bypassing it means
 * the call is invisible to the transcript view.
 *
 * `promptText` overrides the traced prompt when `messages` carries non-text
 * parts (e.g. the OCR vision call attaches a base64 image that must not be
 * persisted as a trace).
 */
export async function invokeAgentText(
  chat: { invoke: (messages: unknown, opts: { timeout: number }) => Promise<{ content?: unknown }> },
  messages: unknown,
  options: {
    agent: string;
    timeout: number;
    env?: NodeJS.ProcessEnv;
    promptVersion?: string | null;
    promptText?: string;
  },
): Promise<string> {
  const trace = startAgentCall({
    agent: options.agent,
    model: geminiModel(options.env ?? process.env),
    promptVersion: options.promptVersion ?? null,
    prompt: options.promptText ?? promptToText(messages),
  });
  try {
    const response = await chat.invoke(messages, { timeout: options.timeout });
    const text = messageText(response?.content);
    settleAgentCall(trace, { responseText: text });
    return text;
  } catch (err) {
    settleAgentCall(trace, { errorMessage: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

/** Coerce a LangChain message content (string | content parts[]) down to text. */
export function messageText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        const text = (part as { text?: unknown })?.text;
        return typeof text === 'string' ? text : '';
      })
      .join('');
  }
  return '';
}

/**
 * Pull and parse the first balanced top-level {...} object out of model text.
 * Brace counting is string-aware: braces inside JSON string values (e.g. a
 * "reason" quoting policy wording) do not shift the balance point.
 */
export function extractJsonObject(raw: string): Record<string, unknown> {
  const text = String(raw ?? '').trim();
  const start = text.indexOf('{');
  if (start === -1) throw new Error('gemini agent: no JSON object in model response');
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) {
      return JSON.parse(text.slice(start, i + 1)) as Record<string, unknown>;
    }
  }
  throw new Error('gemini agent: unbalanced JSON in model response');
}
