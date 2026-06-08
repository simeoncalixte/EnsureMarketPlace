/**
 * Common interface shared by every OCR engine integration.
 *
 * Each concrete provider is an **adapter** that maps a specific OCR engine
 * (Tesseract, a cloud Document-AI API, …) onto this interface, and the
 * connector selects between them at runtime via a **strategy**
 * (see `selectOcrProvider`). Callers only ever depend on this interface.
 */

export interface OcrInput {
  /** Raw bytes of the document/image to OCR. */
  buffer: Buffer;
  /** Optional original filename (helps some providers infer type). */
  fileName?: string;
  /** Optional MIME type (e.g. application/pdf, image/png). */
  mimeType?: string;
}

export interface OcrResult {
  /** Extracted plain text. */
  text: string;
  /** Name of the provider that produced this result. */
  provider: string;
  /**
   * Optional structured/layout output (tables, key-value, bounding boxes).
   * Cloud Document-AI providers can populate this; Tesseract leaves it undefined.
   */
  layout?: Record<string, unknown>;
}

export interface OcrProvider {
  /** Stable identifier, e.g. 'document-ai' or 'tesseract'. */
  readonly name: string;
  /**
   * Whether this provider can run in the current environment (required config
   * present and/or dependencies installed). The strategy picks the first
   * available provider in priority order.
   */
  isAvailable(): boolean;
  /** Run OCR over the input and return the extracted text. */
  recognize(input: OcrInput): Promise<OcrResult>;
}
