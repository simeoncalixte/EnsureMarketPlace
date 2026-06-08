import { OcrInput } from './OcrProvider';
import { selectOcrProvider } from './selectOcrProvider';

export type { OcrInput, OcrResult, OcrProvider } from './OcrProvider';
export { DocumentAiOcrProvider } from './DocumentAiOcrProvider';
export { TesseractOcrProvider } from './TesseractOcrProvider';
export { PlainTextOcrProvider } from './PlainTextOcrProvider';
export { PdfTextOcrProvider } from './PdfTextOcrProvider';
export { DocxOcrProvider } from './DocxOcrProvider';
export { GeminiVisionOcrProvider, isHighPrecisionOcr } from './GeminiVisionOcrProvider';
export { LocalDocumentOcrProvider } from './LocalDocumentOcrProvider';
export { imageMimeType, isImage } from './imageType';
export { selectOcrProvider, defaultOcrProviders } from './selectOcrProvider';

/**
 * Provider-agnostic OCR entry point. Selects an OCR provider via the strategy
 * (Document-AI in production, otherwise the local content-aware dispatcher) and
 * runs it.
 *
 * Kept backwards-compatible (`{ text }`); also returns the provider name and any
 * structured layout the provider produced.
 *
 * Degradation lives inside the selected provider:
 *  - A configured cloud **Document-AI** failure surfaces (never silently degrades).
 *  - The local **LocalDocumentOcrProvider** dispatches by format — text-layer PDF,
 *    `.docx`, plain text, and image OCR (high-precision Gemini vision when enabled,
 *    else Tesseract) — and throws on a binary it genuinely cannot read.
 */
export async function runOcr(
  buffer: Buffer,
  input: Omit<OcrInput, 'buffer'> = {},
): Promise<{ text: string; provider?: string; layout?: Record<string, unknown> }> {
  const provider = selectOcrProvider();
  const result = await provider.recognize({ buffer, ...input });
  return { text: result.text, provider: result.provider, layout: result.layout };
}
