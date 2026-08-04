import { readFileSync } from 'fs';
import path from 'path';
import { runOcr } from '../connectors/ocr';

/**
 * Data-driven OCR extraction coverage over the synthetic document corpus
 * (test/fixtures/ocr-corpus). For every document — multi-page PDFs, single-page
 * PDFs, DOCX, TXT, CSV, JSON, EML, MD — we run the real OCR connector and assert
 * that the fields we embedded survive extraction.
 *
 * The corpus is generated/validated by `npm run corpus:generate`. These tests
 * read the committed files straight from disk, so they exercise the exact bytes
 * that will later be used to simulate submissions.
 */

type ManifestEntry = {
  fileName: string;
  format: string;
  provider: string;
  byteLength: number;
  mustContain: string[];
  expect: Record<string, string>;
};

const CORPUS_DIR = path.join(__dirname, '..', '..', '..', 'test', 'fixtures', 'ocr-corpus');
const manifest: ManifestEntry[] = JSON.parse(readFileSync(path.join(CORPUS_DIR, 'manifest.json'), 'utf8'));

/** Which sub-provider should win for a given format (via runOcr's local path). */
const EXPECTED_PROVIDER: Record<string, string> = {
  'pdf-multi': 'pdf-text',
  'pdf-single': 'pdf-text',
  docx: 'docx',
  txt: 'plain-text',
  csv: 'plain-text',
  json: 'plain-text',
  eml: 'plain-text',
  md: 'plain-text',
};

describe('OCR corpus extraction', () => {
  const originalUrl = process.env.OCR_API_URL;
  beforeAll(() => {
    jest.setTimeout(120_000);
    delete process.env.OCR_API_URL; // force the local extraction path (no Document-AI)
  });
  afterAll(() => {
    if (originalUrl === undefined) delete process.env.OCR_API_URL;
    else process.env.OCR_API_URL = originalUrl;
  });

  it('contains at least 100 documents across all target formats', () => {
    expect(manifest.length).toBeGreaterThanOrEqual(100);
    const formats = new Set(manifest.map((m) => m.format));
    expect([...formats].sort()).toEqual(
      ['csv', 'docx', 'eml', 'json', 'md', 'pdf-multi', 'pdf-single', 'txt'].sort(),
    );
  });

  it.each(manifest.map((m) => [m.fileName, m] as const))(
    'extracts expected data from %s',
    async (_fileName, entry) => {
      const buffer = readFileSync(path.join(CORPUS_DIR, entry.fileName));
      const { text, provider } = await runOcr(buffer, { fileName: entry.fileName });

      expect(provider).toBe(EXPECTED_PROVIDER[entry.format]);
      for (const token of entry.mustContain) {
        expect(text).toContain(token);
      }
    },
  );
});
