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
 *   GEMINI_TIMEOUT_MS  default: 8000
 */

/** An agent is available (LLM is the primary path) when a Gemini key is set. */
export function isGeminiConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.GEMINI_API_KEY);
}

export function geminiModel(env: NodeJS.ProcessEnv = process.env): string {
  return env.GEMINI_MODEL ?? 'gemini-2.5-flash';
}

export function geminiTimeoutMs(env: NodeJS.ProcessEnv = process.env): number {
  return Number(env.GEMINI_TIMEOUT_MS ?? 8000);
}

/**
 * Create a configured ChatGoogleGenerativeAI client (lazy import so the app
 * loads without the SDK until an agent actually runs). `json: true` forces a
 * JSON-only response (supported on gemini-1.5+), which the structured agents use.
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
    maxRetries: 0,
    ...(opts.json ? { json: true } : {}),
  });
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

/** Pull and parse the first balanced top-level {...} object out of model text. */
export function extractJsonObject(raw: string): Record<string, unknown> {
  const text = String(raw ?? '').trim();
  const start = text.indexOf('{');
  if (start === -1) throw new Error('gemini agent: no JSON object in model response');
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) {
      return JSON.parse(text.slice(start, i + 1)) as Record<string, unknown>;
    }
  }
  throw new Error('gemini agent: unbalanced JSON in model response');
}
