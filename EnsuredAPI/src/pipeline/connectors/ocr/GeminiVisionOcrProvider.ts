import { OcrInput, OcrProvider, OcrResult } from './OcrProvider';
import { imageMimeType } from './imageType';
import { isHighPrecision } from '../../highPrecision';

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

    const apiKey = this.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GeminiVisionOcrProvider: GEMINI_API_KEY is not set');

    const model = this.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
    const timeoutMs = Number(this.env.GEMINI_TIMEOUT_MS ?? 8000);

    const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
    const { HumanMessage } = await import('@langchain/core/messages');

    const chat = new ChatGoogleGenerativeAI({ apiKey, model, temperature: 0, maxRetries: 0 });
    const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
    const message = new HumanMessage({
      content: [
        { type: 'text', text: OCR_PROMPT },
        { type: 'image_url', image_url: dataUrl },
      ],
    });

    const response = await chat.invoke([message], { timeout: timeoutMs });
    const text = messageContentToText(response?.content);
    return { text: text.trim(), provider: this.name };
  }
}

const OCR_PROMPT =
  'You are an OCR engine. Extract ALL text from this document image verbatim, '
  + 'preserving the reading order and line breaks. Output only the raw extracted '
  + 'text — no commentary, labels, or markdown.';

/** Truthy parse of the high-precision opt-in flag (shared `OCR_HIGH_PRECISION`). */
export function isHighPrecisionOcr(env: NodeJS.ProcessEnv = process.env): boolean {
  return isHighPrecision(env);
}

/** Coerce a LangChain message content (string | content parts[]) down to text. */
function messageContentToText(content: unknown): string {
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
