import { OcrInput, OcrProvider, OcrResult } from './OcrProvider';

/**
 * Adapter for **digital / text-layer PDFs** — extracts the embedded text layer
 * directly, no OCR engine or cloud call required.
 *
 * A large share of insurance intake (ACORD applications, loss runs, SOV exports,
 * quote letters) arrives as PDFs that were generated digitally and already carry
 * a selectable text layer. For those, extraction is deterministic and free: read
 * each page's text content via `pdfjs-dist`. This does NOT OCR scanned/image-only
 * PDFs — those have no text layer and still need a real engine (Tesseract / cloud
 * Document-AI); this provider returns (near-)empty text for them, and the caller
 * treats empty extraction as "needs a real engine".
 *
 * Implementation notes:
 *  - Uses the `pdfjs-dist` **legacy CJS build** so it loads in plain Node and the
 *    Jest VM without the dynamic-import "fake worker" that newer pdfjs/ESM builds
 *    require.
 *  - Runs with the worker disabled and **destroys the document after every call**
 *    (`page.cleanup()` + `doc.destroy()`). This makes extraction stateless across
 *    calls — essential because the OCR service processes several files per
 *    submission in one process (libraries that leak pdfjs global state corrupt
 *    later documents).
 *  - `verbosity: 0` silences pdfjs's standard-font fetch warnings (harmless in a
 *    headless/no-canvas environment; text still extracts).
 *
 * `pdfjs-dist` is imported lazily so the app loads without pulling it in until a
 * PDF is actually processed.
 */
export class PdfTextOcrProvider implements OcrProvider {
  readonly name = 'pdf-text';

  /** Available wherever `pdfjs-dist` is installed (a regular dependency). */
  isAvailable(): boolean {
    return true;
  }

  async recognize(input: OcrInput): Promise<OcrResult> {
    const buffer = input.buffer ?? Buffer.alloc(0);
    if (!isPdf(buffer)) {
      throw new Error('PdfTextOcrProvider: input is not a PDF (missing %PDF- header)');
    }

    const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.js')) as any;
    const task = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useWorker: false,
      isEvalSupported: false,
      verbosity: 0,
    });
    const doc = await task.promise;
    try {
      const pages: string[] = [];
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => (typeof item?.str === 'string' ? item.str : ''))
          .join(' ');
        pages.push(pageText);
        page.cleanup();
      }
      // Collapse runs of whitespace; join pages with newlines.
      const text = pages.map((t) => t.replace(/[ \t]+/g, ' ').trim()).join('\n').trim();
      return { text, provider: this.name };
    } finally {
      await doc.destroy();
    }
  }
}

/** A PDF always begins with the `%PDF-` signature. */
export function isPdf(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-';
}
