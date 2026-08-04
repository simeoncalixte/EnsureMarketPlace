import { OcrInput, OcrProvider, OcrResult } from './OcrProvider';

/**
 * Adapter for **Word `.docx`** documents — extracts the raw text from the
 * document body, no OCR engine or cloud call required.
 *
 * Broker cover letters, narratives, and many application forms arrive as `.docx`.
 * A `.docx` is a ZIP container of XML parts; `mammoth` reads `word/document.xml`
 * and returns the plain text. Deterministic, in-process, free.
 *
 * Only the modern Office Open XML `.docx` is supported (ZIP / `PK\x03\x04`
 * signature). Legacy binary `.doc` is a different, undocumented format and is not
 * handled here — it would need a dedicated converter or a real OCR engine.
 *
 * `mammoth` is imported lazily so it loads only when a DOCX is actually processed.
 */
export class DocxOcrProvider implements OcrProvider {
  readonly name = 'docx';

  /** Available wherever `mammoth` is installed (a regular dependency). */
  isAvailable(): boolean {
    return true;
  }

  async recognize(input: OcrInput): Promise<OcrResult> {
    const buffer = input.buffer ?? Buffer.alloc(0);
    if (!isZip(buffer)) {
      throw new Error('DocxOcrProvider: input is not a .docx (missing ZIP/PK header)');
    }

    const mammoth = (await import('mammoth')) as any;
    // mammoth throws if the ZIP is not a valid Office Open XML document.
    const result = await mammoth.extractRawText({ buffer });
    return { text: String(result?.value ?? '').trim(), provider: this.name };
  }
}

/** A `.docx` (Office Open XML) is a ZIP archive — `PK\x03\x04` local-file header. */
export function isZip(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 && // P
    buffer[1] === 0x4b && // K
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  );
}
