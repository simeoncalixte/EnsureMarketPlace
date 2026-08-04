import { OcrInput, OcrProvider, OcrResult } from './OcrProvider';

/**
 * Adapter for local OCR via `tesseract.js` — the dev/offline fallback.
 *
 * Open-source and runs entirely in-process (no document leaves the environment,
 * no per-page cost), which is ideal for local development and handling sensitive
 * submission documents. It is the lowest-priority provider; if the optional
 * `tesseract.js` dependency is not installed, `recognize()` surfaces a clear
 * error so the operator knows to install it (or configure a Document-AI provider).
 *
 * Targets the modern tesseract.js (v5+) worker API: `createWorker('eng')`.
 */
export class TesseractOcrProvider implements OcrProvider {
  readonly name = 'tesseract';

  private readonly language: string;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.language = env.OCR_TESSERACT_LANG ?? 'eng';
  }

  /** Always available as the guaranteed local fallback (errors clearly if the dep is missing). */
  isAvailable(): boolean {
    return true;
  }

  async recognize(input: OcrInput): Promise<OcrResult> {
    let createWorker: (lang?: string) => Promise<{ recognize: (b: unknown) => Promise<{ data?: { text?: string } }>; terminate: () => Promise<unknown> }>;
    try {
      // Optional dependency — imported lazily so the app loads without it.
      // The specifier is cast to avoid a compile-time module-resolution error
      // when the optional package isn't installed.
      ({ createWorker } = (await import('tesseract.js' as any)) as any);
    } catch (err) {
      throw new Error(
        `TesseractOcrProvider: tesseract.js is not installed — install it or configure a Document-AI provider (${err instanceof Error ? err.message : String(err)})`,
      );
    }

    const worker = await createWorker(this.language);
    try {
      const { data } = await worker.recognize(input.buffer);
      return { text: String(data?.text ?? ''), provider: this.name };
    } finally {
      await worker.terminate();
    }
  }
}
