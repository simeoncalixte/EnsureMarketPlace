import { readFileSync } from 'fs';
import path from 'path';
import { runOcr } from './index';
import { GeminiVisionOcrProvider } from './GeminiVisionOcrProvider';

/**
 * Real (non-mocked) image OCR over two committed PNG fixtures, exercising BOTH
 * engines end-to-end:
 *   - Tesseract (local, free)            — downloads a language model on first run
 *   - Gemini vision (LangChain, paid)    — needs GEMINI_API_KEY, makes a real call
 *
 * These are OFF by default (they need network/model download and, for Gemini, a
 * paid API call). Opt in explicitly with the shared live-test flag:
 *
 *   RUN_REAL_LLM=1 npx jest src/pipeline/connectors/ocr/imageOcr.real.test.ts
 *   # add GEMINI_API_KEY to also run the Gemini-vision case
 *
 * The default `npm test` run skips this suite, keeping CI fast, offline, and free.
 */
const RUN = process.env.RUN_REAL_LLM === '1';
const realDescribe = RUN ? describe : describe.skip;

const IMG_DIR = path.join(__dirname, '..', '..', '..', '..', 'test', 'fixtures', 'ocr-corpus', 'images');
const IMAGES = [
  { file: 'scan-acord-application.png', tokens: ['ACME ENERGY', 'SUB-2026-9001', 'POL-26-90001'] },
  { file: 'scan-loss-run.png', tokens: ['BETA MANUFACTURING', 'CLM-7788'] },
];

realDescribe('real image OCR (RUN_REAL_OCR=1)', () => {
  jest.setTimeout(180_000);

  describe('Tesseract (local engine, high-precision OFF)', () => {
    it.each(IMAGES)('extracts text from $file', async ({ file, tokens }) => {
      delete process.env.OCR_API_URL;
      delete process.env.OCR_HIGH_PRECISION;
      const buffer = readFileSync(path.join(IMG_DIR, file));
      const { text, provider } = await runOcr(buffer, { fileName: file });
      expect(provider).toBe('tesseract');
      for (const token of tokens) expect(text).toContain(token);
    });
  });

  const geminiDescribe = process.env.GEMINI_API_KEY ? describe : describe.skip;
  geminiDescribe('Gemini vision (LangChain agent, high-precision ON)', () => {
    it.each(IMAGES)('extracts text from $file', async ({ file, tokens }) => {
      const buffer = readFileSync(path.join(IMG_DIR, file));
      const provider = new GeminiVisionOcrProvider({ ...process.env, OCR_HIGH_PRECISION: '1' });
      const { text, provider: name } = await provider.recognize({ buffer, fileName: file });
      expect(name).toBe('gemini-vision');
      for (const token of tokens) expect(text).toContain(token);
    });
  });
});
