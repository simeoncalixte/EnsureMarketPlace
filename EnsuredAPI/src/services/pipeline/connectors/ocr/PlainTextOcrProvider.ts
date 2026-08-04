import { OcrInput, OcrProvider, OcrResult } from './OcrProvider';

/**
 * Adapter for documents that are *already* text — no OCR engine required.
 *
 * Insurance intake isn't only scanned images: a lot of it arrives as text-based
 * payloads (email bodies, CSV/JSON exposure extracts, `.txt`/`.md` notes, and
 * text-layer PDFs exported to plain text). For those, "OCR" is just decoding the
 * bytes — which works in any environment with no native dependency and no cloud
 * call.
 *
 * This provider is therefore the dependency-free local degradation used by
 * `runOcr` when the Tesseract fallback can't run (its optional dep isn't
 * installed). It deliberately refuses binary input (returns *no* result) so it
 * never passes off a naive byte-decode of a scanned image/PDF as "extracted
 * text" — a real engine is still required for those.
 */
export class PlainTextOcrProvider implements OcrProvider {
  readonly name = 'plain-text';

  /** Always runnable — pure, in-process, no external dependency. */
  isAvailable(): boolean {
    return true;
  }

  async recognize(input: OcrInput): Promise<OcrResult> {
    const buffer = input.buffer ?? Buffer.alloc(0);
    if (looksBinary(buffer)) {
      throw new Error(
        'PlainTextOcrProvider: input is not UTF-8 text (binary content) — a real OCR engine is required for scanned images/PDFs',
      );
    }
    return { text: buffer.toString('utf8'), provider: this.name };
  }
}

/**
 * Heuristic binary sniff: a NUL byte (or a high ratio of non-text control bytes)
 * in the first few KB indicates a binary format (PDF, PNG, JPEG, …) rather than
 * decodable text. Plain text / CSV / JSON / email bodies contain neither.
 */
function looksBinary(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, 8192);
  if (sample.length === 0) return false;
  let suspicious = 0;
  for (const byte of sample) {
    if (byte === 0) return true; // NUL → definitely binary
    // Control chars except tab (9), LF (10), CR (13), form-feed (12).
    if (byte < 9 || (byte > 13 && byte < 32)) suspicious += 1;
  }
  return suspicious / sample.length > 0.3;
}
