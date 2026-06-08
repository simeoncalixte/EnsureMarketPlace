import { runOcr } from './index';

/**
 * These assert the local degradation path. `tesseract.js` is an optional dep that
 * is NOT installed in this repo, so with no `OCR_API_URL` configured the strategy
 * selects Tesseract, its lazy import fails, and `runOcr` degrades to the
 * format-aware LocalDocumentOcrProvider (PDF → pdf-text, DOCX → docx, else →
 * plain-text). Plain text decodes here; binary with no text layer surfaces the
 * engine error (see the corpus and provider suites for the PDF/DOCX positive cases).
 */
describe('runOcr (local degradation)', () => {
  const originalUrl = process.env.OCR_API_URL;

  beforeEach(() => {
    delete process.env.OCR_API_URL; // ensure Document-AI is not selected
  });

  afterAll(() => {
    if (originalUrl === undefined) delete process.env.OCR_API_URL;
    else process.env.OCR_API_URL = originalUrl;
  });

  it('extracts text from a text document when no OCR engine is available', async () => {
    const text = 'Submission SUB-0001\nPeril: Hurricane\nTotal Insured Value: $50,000,000';
    const result = await runOcr(Buffer.from(text, 'utf8'), { fileName: 'acord.txt' });
    expect(result.provider).toBe('plain-text');
    expect(result.text).toBe(text);
  });

  it('surfaces an error for binary input with no text layer (no garbage fallback)', async () => {
    // "%PDF" + NUL — not a valid PDF (no %PDF- signature), not an image, not text.
    // The dispatcher routes it to the plain-text extractor, which refuses binary.
    const binary = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x00, 0xff, 0xfe]);
    await expect(runOcr(binary, { fileName: 'scan.bin' })).rejects.toThrow(/not UTF-8 text/);
  });
});
