/**
 * One-off connectivity health check for the Google Gemini (AI Studio) LLM
 * connector. Uses the SAME configuration and client as the validation semantic
 * adapter (GEMINI_API_KEY / GEMINI_MODEL / GEMINI_TIMEOUT_MS, via LangChain's
 * ChatGoogleGenerativeAI), sends a trivial prompt, and writes the outcome to
 * llm-healthcheck-result.json.
 *
 *   npx ts-node --transpile-only src/llmHealthcheck.ts
 */
import 'dotenv/config'; // load EnsuredAPI/.env so GEMINI_* can live there
import { writeFileSync } from 'fs';
import path from 'path';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_TIMEOUT_MS = 8000;
const PROMPT = 'Connectivity health check. Reply with the single word: OK';

/** Coerce a LangChain message content (string | content parts[]) down to text. */
function contentToText(content: unknown): string | null {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const text = content
      .map((part) => (typeof part === 'string' ? part : (part as any)?.text ?? ''))
      .join('');
    return text || null;
  }
  return null;
}

function finish(result: Record<string, unknown>): void {
  result.finishedAt = new Date().toISOString();
  const outPath = path.join(process.cwd(), 'llm-healthcheck-result.json');
  writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
  // eslint-disable-next-line no-console
  console.log(`\nWrote ${outPath}\n`);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(result, null, 2));
}

async function main(): Promise<void> {
  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  const apiKey = process.env.GEMINI_API_KEY;

  const result: Record<string, unknown> = {
    check: 'gemini-llm-healthcheck',
    provider: 'google-gemini',
    startedAt: new Date().toISOString(),
    model,
    prompt: PROMPT,
  };

  if (!apiKey) {
    result.status = 'not_configured';
    result.connected = false;
    result.error = 'GEMINI_API_KEY is not set — cannot reach the LLM API. Set it in EnsuredAPI/.env and re-run.';
    finish(result);
    return;
  }

  const startedMs = Date.now();
  try {
    const chat = new ChatGoogleGenerativeAI({
      apiKey,
      model,
      temperature: 0,
      maxRetries: 0,
    });

    const response = await chat.invoke([{ role: 'user', content: PROMPT }], { timeout: timeoutMs });

    result.latencyMs = Date.now() - startedMs;
    result.status = 'ok';
    result.connected = true;
    result.reply = contentToText(response?.content);
    result.usage = (response as any)?.usage_metadata ?? null;
  } catch (err) {
    result.latencyMs = Date.now() - startedMs;
    result.status = 'error';
    result.connected = false;
    result.error = err instanceof Error ? err.message : String(err);
  }

  finish(result);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('healthcheck crashed:', err);
  process.exit(1);
});
