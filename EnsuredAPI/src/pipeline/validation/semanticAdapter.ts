import { createGeminiChat, geminiModel, geminiTimeoutMs, invokeAgentText, isGeminiConfigured } from '../agents/gemini';
import {
  buildJudgeMessages,
  parseVerdict,
  semanticInputIsEmpty,
  SEMANTIC_PROMPT_VERSION,
  SemanticJudge,
} from './semantic';

// The ONE impure piece of the semantic agent: a chat call to Google's Gemini
// API (AI Studio), made through the shared pipeline Gemini client (which sets
// temperature 0, json mode, and one retry on transient failures). It is a thin
// shell — build the prompt (pure) -> invoke -> parse the response (pure).
// Everything that can be reasoned about lives in semantic.ts; this file only
// does I/O.
//
// Config (shared with the other pipeline agents via agents/gemini.ts):
//   GEMINI_API_KEY    required to enable the judge (absent => abstain, no call)
//   GEMINI_MODEL      default: gemini-2.5-flash
//   GEMINI_TIMEOUT_MS default: 8000 — per-call invoke timeout
//
// `json: true` forces a JSON-only response, which is what parseVerdict expects.

export const geminiSemanticJudge: SemanticJudge = async (input) => {
  if (!isGeminiConfigured()) return null; // unconfigured -> abstain, no network call

  // An all-null snapshot has nothing to judge — skip the paid call entirely
  // rather than asking the model to opine on five nulls.
  if (semanticInputIsEmpty(input)) return null;

  const { system, user } = buildJudgeMessages(input);

  try {
    const chat = await createGeminiChat(process.env, { json: true });

    const raw = await invokeAgentText(
      chat,
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      {
        agent: 'semantic_validation',
        timeout: geminiTimeoutMs(),
        promptVersion: SEMANTIC_PROMPT_VERSION,
      },
    );

    const verdict = parseVerdict(raw);
    // Stamp provenance: which model + prompt revision produced this verdict.
    if (verdict) verdict.modelVersion = `${geminiModel()}:${SEMANTIC_PROMPT_VERSION}`;
    return verdict;
  } catch (err) {
    // Abstain (fail safe), but never silently: an expired key or a week of
    // timeouts must be distinguishable from a genuine ABSTAIN in the logs.
    // eslint-disable-next-line no-console
    console.warn(
      'validation: semantic judge call failed; abstaining:',
      err instanceof Error ? `${err.name}: ${err.message}` : err,
    );
    return null;
  }
};
