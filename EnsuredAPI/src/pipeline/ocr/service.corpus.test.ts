import path from 'path';
import os from 'os';
import { writeFileSync, rmSync } from 'fs';

// Mock the Sequelize model so the service reads our corpus files from disk
// instead of a database. Everything else (runOcr, extraction) is real.
jest.mock('../../db/models', () => ({
  SubmissionFile: { findAll: jest.fn() },
}));

import { SubmissionFile } from '../../db/models';
import { OcrService } from './service';

const CORPUS_DIR = path.join(__dirname, '..', '..', '..', 'test', 'fixtures', 'ocr-corpus');
const findAll = SubmissionFile.findAll as unknown as jest.Mock;

/** A stand-in for a Sequelize SubmissionFile row (only `.get(key)` is used). */
function fakeFile(id: number, storagePath: string, fileName: string) {
  const values: Record<string, unknown> = { id, storagePath, fileName };
  return { get: (key: string) => values[key] };
}

describe('OcrService orchestration over corpus files', () => {
  const originalUrl = process.env.OCR_API_URL;
  beforeEach(() => {
    delete process.env.OCR_API_URL; // force the local extraction path
    findAll.mockReset();
  });
  afterAll(() => {
    if (originalUrl === undefined) delete process.env.OCR_API_URL;
    else process.env.OCR_API_URL = originalUrl;
  });

  it('extracts and concatenates text across multiple files of different formats', async () => {
    findAll.mockResolvedValue([
      fakeFile(1, path.join(CORPUS_DIR, '0001-acord-application.pdf'), '0001-acord-application.pdf'),
      fakeFile(2, path.join(CORPUS_DIR, '0069-underwriting-notes.txt'), '0069-underwriting-notes.txt'),
    ]);

    const onSuccess = jest.fn();
    const res: any = await new OcrService().process({ submission: { id: 7, tenantId: 3 } }, { onSuccess });

    expect(res.ok).toBe(true);
    expect(res.documents).toHaveLength(2);
    expect(res.warnings).toEqual([]);
    expect(onSuccess).toHaveBeenCalledTimes(1);

    const success = onSuccess.mock.calls[0][0];
    expect(success.submissionId).toBe(7);
    expect(success.tenantId).toBe(3);
    expect(success.text).toContain('SUB-2026-1000'); // from the multi-page PDF
    expect(success.text).toContain('UNDERWRITING NOTES'); // from the TXT
  });

  it('records a warning for a missing storage path but still succeeds on the rest', async () => {
    findAll.mockResolvedValue([
      fakeFile(1, '', 'no-path.pdf'),
      fakeFile(2, path.join(CORPUS_DIR, '0106-underwriting-memo.md'), '0106-underwriting-memo.md'),
    ]);

    const res: any = await new OcrService().process({ submission: { id: 8 } });

    expect(res.ok).toBe(true);
    expect(res.documents).toHaveLength(1);
    expect(res.warnings.join(' ')).toMatch(/Missing storage path/);
  });

  it('degrades gracefully on an unreadable binary (no text layer): warning, no crash, no text', async () => {
    // Binary blob that is neither text, PDF, DOCX, nor a recognized image — the
    // dispatcher can't extract it, so the service records a warning and continues.
    // (A *valid* image would instead be OCR'd; see imageOcr.real.test.ts.)
    const binPath = path.join(os.tmpdir(), `ocr-corpus-corrupt-${process.pid}.bin`);
    writeFileSync(binPath, Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe, 0x00, 0x10]));
    findAll.mockResolvedValue([fakeFile(1, binPath, 'corrupt.bin')]);

    try {
      const res: any = await new OcrService().process({ submission: { id: 9 } });
      expect(res.ok).toBe(true);
      expect(res.documents).toHaveLength(0);
      expect(res.text).toBe('');
      expect(res.warnings.join(' ')).toMatch(/OCR failed for corrupt\.bin/);
    } finally {
      rmSync(binPath, { force: true });
    }
  });
});
