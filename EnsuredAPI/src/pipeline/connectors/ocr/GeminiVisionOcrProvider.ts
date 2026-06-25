import { OcrInput, OcrProvider, OcrResult } from './OcrProvider';
import { imageMimeType } from './imageType';
import { isHighPrecision } from '../../highPrecision';
import { createGeminiChat, geminiTimeoutMs, invokeAgentText } from '../../agents/gemini';

/**
 * High-precision image OCR via a **LangChain agent backed by a Gemini vision
 * model**. The document image is sent to Gemini (multimodal) with an extract-all-
 * text instruction; Gemini reads scanned/photographed documents far more
 * accurately than a local engine, at the cost of a paid API call per image.
 *
 * This is an **opt-in, billable** path: it is only available when the
 * `OCR_HIGH_PRECISION` flag is enabled AND a `GEMINI_API_KEY` is present. When it
 * is not enabled (or it fails), the dispatcher falls back to the local Tesseract
 * engine. It reuses the same Gemini configuration as the validation judge:
 *   GEMINI_API_KEY    required
 *   GEMINI_MODEL      default: gemini-2.5-flash (must be a vision-capable model)
 *   GEMINI_TIMEOUT_MS default: 8000
 *
 * The LangChain client is imported lazily so the app loads without it until a
 * high-precision image OCR is actually requested.
 */
export class GeminiVisionOcrProvider implements OcrProvider {
  readonly name = 'gemini-vision';

  private readonly env: NodeJS.ProcessEnv;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.env = env;
  }

  /** Enabled only when high-precision OCR is opted into and a Gemini key exists. */
  isAvailable(): boolean {
    return isHighPrecisionOcr(this.env) && Boolean(this.env.GEMINI_API_KEY);
  }

  async recognize(input: OcrInput): Promise<OcrResult> {
    const buffer = input.buffer ?? Buffer.alloc(0);
    const mime = input.mimeType ?? imageMimeType(buffer);
    if (!mime) throw new Error('GeminiVisionOcrProvider: input is not a recognized image');

    const chat = await createGeminiChat(this.env);
    const { HumanMessage } = await import('@langchain/core/messages');

    const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
    const message = new HumanMessage({
      content: [
        { type: 'text', text: OCR_PROMPT },
        { type: 'image_url', image_url: dataUrl },
      ],
    });

    const raw = await invokeAgentText(chat, [message], {
      agent: 'ocr_vision',
      timeout: geminiTimeoutMs(this.env),
      env: this.env,
      // The traced prompt must describe the call, never embed the base64 image.
      promptText: `${OCR_PROMPT}\n\n[attached: ${mime} document image, ${buffer.length} bytes]`,
    });
    const text = stripCodeFences(raw);
    return { text: text.trim(), provider: this.name };
  }
}

const OCR_PROMPT =
  'You are an OCR engine. Extract ALL text from this document image verbatim, '
  + 'preserving the reading order and line breaks. Render form checkboxes and '
  + 'selection marks with their state and label, e.g. "[x] Flood coverage" for a '
  + 'checked box and "[ ] Earthquake" for an unchecked one. If the image contains '
  + 'no legible text, output nothing at all — NEVER invent or guess text you '
  + 'cannot actually read. Output only the raw extracted text — no commentary, '
  + 'labels, or markdown.';

/**
 * Defense against a model that wraps its output in a markdown code fence despite
 * the no-markdown instruction — the fence must not be persisted as document text.
 */
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```[a-zA-Z]*\n([\s\S]*?)\n?```$/);
  return fenced ? fenced[1] : trimmed;
}

/** Truthy parse of the high-precision opt-in flag (shared `OCR_HIGH_PRECISION`). */
export function isHighPrecisionOcr(env: NodeJS.ProcessEnv = process.env): boolean {
  return isHighPrecision(env);
}
