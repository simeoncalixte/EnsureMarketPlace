import { OcrInput, OcrProvider, OcrResult } from './OcrProvider';
import { PdfTextOcrProvider, isPdf } from './PdfTextOcrProvider';
import { DocxOcrProvider, isZip } from './DocxOcrProvider';
import { PlainTextOcrProvider } from './PlainTextOcrProvider';
import { TesseractOcrProvider } from './TesseractOcrProvider';
import { GeminiVisionOcrProvider } from './GeminiVisionOcrProvider';
import { imageMimeType } from './imageType';

/**
 * The local, content-aware extraction path: a **dispatcher** that sniffs the
 * buffer's magic bytes and routes to the right extractor —
 *
 *   `%PDF-`        → {@link PdfTextOcrProvider}    (digital/text-layer PDF)
 *   `PK\x03\x04`   → {@link DocxOcrProvider}       (Word .docx)
 *   image headers  → image OCR (see below)
 *   otherwise      → {@link PlainTextOcrProvider}  (txt/csv/json/eml/md/…)
 *
 * Image OCR is tiered:
 *   - When **high-precision** is enabled (`OCR_HIGH_PRECISION` + `GEMINI_API_KEY`),
 *     the image is sent to the {@link GeminiVisionOcrProvider} LangChain agent — a
 *     paid, far more accurate read (cost is opted into by the operator).
 *   - Otherwise (or if the Gemini call fails), it falls back to the local
 *     {@link TesseractOcrProvider} engine — free and offline.
 *
 * This is what `runOcr` uses as the local strategy entry when no cloud
 * Document-AI is configured (the common dev/test/offline case). It deliberately
 * does NOT fabricate text for formats it can't truly read: a non-text binary that
 * is neither PDF/DOCX nor a recognized image makes the plain-text extractor throw,
 * surfacing "a real OCR engine is required" rather than garbage.
 *
 * The result's `provider` reflects the concrete sub-provider that ran
 * (`pdf-text` / `docx` / `gemini-vision` / `tesseract` / `plain-text`).
 */
export class LocalDocumentOcrProvider implements OcrProvider {
  readonly name = 'local-document';

  private readonly env: NodeJS.ProcessEnv;
  private readonly pdf = new PdfTextOcrProvider();
  private readonly docx = new DocxOcrProvider();
  private readonly plain = new PlainTextOcrProvider();

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.env = env;
  }

  /** Always runnable — its dependencies are regular, in-process libraries. */
  isAvailable(): boolean {
    return true;
  }

  async recognize(input: OcrInput): Promise<OcrResult> {
    const buffer = input.buffer ?? Buffer.alloc(0);
    if (isPdf(buffer)) return this.pdf.recognize(input);
    if (isZip(buffer)) return this.docx.recognize(input);

    const mime = imageMimeType(buffer);
    if (mime) return this.recognizeImage({ ...input, mimeType: mime });

    return this.plain.recognize(input); // throws on non-text binary
  }

  /** Image OCR: high-precision Gemini vision when enabled, Tesseract fallback. */
  private async recognizeImage(input: OcrInput): Promise<OcrResult> {
    const gemini = new GeminiVisionOcrProvider(this.env);
    if (gemini.isAvailable()) {
      try {
        return await gemini.recognize(input);
      } catch (_) {
        // High-precision read failed (network/timeout/quota) — degrade to the
        // local engine rather than failing the whole document.
      }
    }
    return new TesseractOcrProvider(this.env).recognize(input);
  }
}
