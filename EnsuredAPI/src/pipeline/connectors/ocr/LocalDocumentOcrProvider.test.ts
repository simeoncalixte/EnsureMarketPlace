import { PDFDocument, StandardFonts } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { LocalDocumentOcrProvider } from './LocalDocumentOcrProvider';
import { isPdf } from './PdfTextOcrProvider';
import { isZip } from './DocxOcrProvider';
import { imageMimeType } from './imageType';

// Mock the two image OCR engines so routing/fallback is tested deterministically,
// with no model download (tesseract) and no paid API call (gemini-vision).
const tessRecognize = jest.fn();
const tessCreateWorker = jest.fn(async () => ({ recognize: tessRecognize, terminate: jest.fn() }));
jest.mock('tesseract.js', () => ({ createWorker: (...a: unknown[]) => tessCreateWorker(...a) }));

const geminiInvoke = jest.fn();
jest.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: jest.fn().mockImplementation(() => ({ invoke: (...a: unknown[]) => geminiInvoke(...a) })),
}));

async function makePdf(lines: string[]): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  let y = 740;
  for (const l of lines) {
    page.drawText(l, { x: 50, y, size: 12, font });
    y -= 20;
  }
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}

async function makeDocx(lines: string[]): Promise<Buffer> {
  const doc = new Document({ sections: [{ children: lines.map((l) => new Paragraph({ children: [new TextRun(l)] })) }] });
  return Packer.toBuffer(doc);
}

/** PNG signature (12 bytes) — recognized as image/png, content irrelevant to mocks. */
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

describe('magic-byte guards', () => {
  it('isPdf only matches the full %PDF- signature', () => {
    expect(isPdf(Buffer.from('%PDF-1.7\n'))).toBe(true);
    expect(isPdf(Buffer.from([0x25, 0x50, 0x44, 0x46, 0x00]))).toBe(false);
    expect(isPdf(Buffer.from('plain text'))).toBe(false);
  });

  it('isZip matches the PK\\x03\\x04 header; imageMimeType detects PNG', () => {
    expect(isZip(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]))).toBe(true);
    expect(isZip(PNG_BYTES)).toBe(false);
    expect(imageMimeType(PNG_BYTES)).toBe('image/png');
    expect(imageMimeType(Buffer.from('not an image'))).toBeNull();
  });
});

describe('LocalDocumentOcrProvider (content dispatcher)', () => {
  const HIGH_PRECISION_ENV = { OCR_HIGH_PRECISION: '1', GEMINI_API_KEY: 'k', GEMINI_MODEL: 'gemini-2.5-flash' } as unknown as NodeJS.ProcessEnv;

  beforeEach(() => {
    tessRecognize.mockReset();
    tessCreateWorker.mockClear();
    geminiInvoke.mockReset();
  });

  it('routes a text-layer PDF to the pdf-text extractor', async () => {
    const buf = await makePdf(['Named Insured: Acme LLC', 'Policy Number: POL-99']);
    const result = await new LocalDocumentOcrProvider({} as NodeJS.ProcessEnv).recognize({ buffer: buf, fileName: 'a.pdf' });
    expect(result.provider).toBe('pdf-text');
    expect(result.text).toContain('POL-99');
  });

  it('routes a .docx to the docx extractor', async () => {
    const buf = await makeDocx(['Named Insured: Beta Inc', 'Requested Limit: $10,000,000']);
    const result = await new LocalDocumentOcrProvider({} as NodeJS.ProcessEnv).recognize({ buffer: buf, fileName: 'b.docx' });
    expect(result.provider).toBe('docx');
    expect(result.text).toContain('Beta Inc');
  });

  it('routes plain UTF-8 text to the plain-text extractor', async () => {
    const buf = Buffer.from('Submission: SUB-1\nTIV: $5,000,000', 'utf8');
    const result = await new LocalDocumentOcrProvider({} as NodeJS.ProcessEnv).recognize({ buffer: buf, fileName: 'c.txt' });
    expect(result.provider).toBe('plain-text');
    expect(result.text).toContain('SUB-1');
  });

  it('refuses a non-text, non-image binary rather than emitting garbage', async () => {
    const binary = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]); // NUL → binary, no known signature
    await expect(new LocalDocumentOcrProvider({} as NodeJS.ProcessEnv).recognize({ buffer: binary })).rejects.toThrow(/not UTF-8 text/);
  });

  // --- image OCR routing -----------------------------------------------------

  it('routes an image to Tesseract when high-precision is OFF', async () => {
    tessRecognize.mockResolvedValue({ data: { text: 'OCR via tesseract' } });
    const provider = new LocalDocumentOcrProvider({} as NodeJS.ProcessEnv); // no flag
    const result = await provider.recognize({ buffer: PNG_BYTES, fileName: 'scan.png' });
    expect(result.provider).toBe('tesseract');
    expect(result.text).toContain('OCR via tesseract');
    expect(geminiInvoke).not.toHaveBeenCalled();
  });

  it('routes an image to the Gemini-vision agent when high-precision is ON', async () => {
    geminiInvoke.mockResolvedValue({ content: 'OCR via gemini vision' });
    const provider = new LocalDocumentOcrProvider(HIGH_PRECISION_ENV);
    const result = await provider.recognize({ buffer: PNG_BYTES, fileName: 'scan.png' });
    expect(result.provider).toBe('gemini-vision');
    expect(result.text).toContain('OCR via gemini vision');
    expect(geminiInvoke).toHaveBeenCalledTimes(1);
    expect(tessCreateWorker).not.toHaveBeenCalled();
  });

  it('falls back to Tesseract when the high-precision Gemini call fails', async () => {
    geminiInvoke.mockRejectedValue(new Error('quota exceeded'));
    tessRecognize.mockResolvedValue({ data: { text: 'OCR via tesseract fallback' } });
    const provider = new LocalDocumentOcrProvider(HIGH_PRECISION_ENV);
    const result = await provider.recognize({ buffer: PNG_BYTES, fileName: 'scan.png' });
    expect(result.provider).toBe('tesseract');
    expect(result.text).toContain('fallback');
    expect(geminiInvoke).toHaveBeenCalledTimes(1);
    expect(tessCreateWorker).toHaveBeenCalledTimes(1);
  });
});
