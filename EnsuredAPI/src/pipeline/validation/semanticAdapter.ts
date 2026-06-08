import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { asText, toRecord } from './coerce';
import { buildJudgeMessages, parseVerdict, SemanticJudge } from './semantic';

/** Narrow a LangChain message content (string | content parts[]) down to text. */
function extractContent(content: unknown): string | null {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const text = content
      .map((part) => (typeof part === 'string' ? part : asText(toRecord(part).text) ?? ''))
      .join('');
    return text || null;
  }
  return null;
}

// The ONE impure piece of the semantic agent: a chat call to Google's Gemini
// API (AI Studio), made through LangChain's ChatGoogleGenerativeAI client. It is
// a thin shell — build the prompt (pure) -> invoke -> parse the response (pure).
// Everything that can be reasoned about lives in semantic.ts; this file only
// does I/O.
//
// The model, API key, and related config are routed straight into the LangChain
// client (all optional; absent key => the judge abstains, so the validation
// stage behaves exactly as before):
//   GEMINI_API_KEY    required to enable the judge -> ChatGoogleGenerativeAI apiKey
//   GEMINI_MODEL      default: gemini-2.5-flash     -> model
//   GEMINI_TIMEOUT_MS default: 8000                 -> per-call invoke timeout
//
// `json: true` forces a JSON-only response (supported on gemini-1.5 and later),
// which is what parseVerdict expects.

const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_TIMEOUT_MS = 8000;

export const geminiSemanticJudge: SemanticJudge = async (input) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null; // unconfigured -> abstain, no network call

  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);

  const { system, user } = buildJudgeMessages(input);

  try {
    const chat = new ChatGoogleGenerativeAI({
      apiKey,
      model,
      temperature: 0,
      maxRetries: 0,
      json: true,
    });

    const response = await chat.invoke(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { timeout: timeoutMs },
    );

    const verdict = parseVerdict(extractContent(response?.content) ?? '');
    if (verdict && !verdict.modelVersion) verdict.modelVersion = model;
    return verdict;
  } catch (_) {
    return null; // network/timeout/parse error -> abstain (fail safe)
  }
};
