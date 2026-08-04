import { SubmissionFile } from '../../../db/models';
import { runOcr } from '../connectors/ocr';
import { getS3Object } from '../connectors/s3';

export type OcrDocument = {
  fileName: string;
  storagePath: string;
  text: string;
};

export type OcrSuccess = {
  submissionId: number;
  organizationId: number | null;
  text: string;
  documents: OcrDocument[];
  warnings: string[];
};

export type OcrFailure = {
  submissionId: number | null;
  error: string;
};

export type OcrCallbacks = {
  /** Called with the extracted text when OCR completes. Output side effects (e.g. persistence) live here. */
  onSuccess?: (result: OcrSuccess) => void | Promise<void>;
  /** Called when OCR cannot proceed (no submission) or fails unexpectedly. */
  onFailure?: (failure: OcrFailure) => void | Promise<void>;
};

function sliceText(text: string, max = 12000): string {
  return text.length > max ? text.slice(0, max) : text;
}

async function readStoragePath(storagePath: string): Promise<Buffer | null> {
  if (!storagePath) return null;
  if (storagePath.startsWith('s3://')) {
    const s = storagePath.replace('s3://', '');
    const idx = s.indexOf('/');
    if (idx <= 0) return null;
    const bucket = s.slice(0, idx);
    const key = s.slice(idx + 1);
    return getS3Object(bucket, key);
  }
  try {
    const fs = await import('fs/promises');
    return await fs.readFile(storagePath);
  } catch (_) {
    return null;
  }
}

/**
 * OCR pipeline stage. Reads a submission's files, runs the provider-agnostic OCR
 * connector (Document-AI in prod, Tesseract fallback locally) over each, and
 * emits the result through callbacks.
 *
 * The service performs no output side effects of its own (it does not persist) —
 * the caller supplies `onSuccess`/`onFailure`, keeping the service free of
 * persistence concerns and trivially testable. The computed result is also
 * returned for the HTTP response.
 */
export class OcrService {
  async process(payload: any, callbacks: OcrCallbacks = {}): Promise<Record<string, unknown>> {
    const submission = payload?.submission;
    if (!submission || !submission.id) {
      await callbacks.onFailure?.({ submissionId: null, error: 'missing submission' });
      return { ok: false, service: 'ocr', error: 'missing submission' };
    }

    const submissionId = Number(submission.id);
    const organizationId = submission.organizationId ?? null;

    try {
      const files = await SubmissionFile.findAll({ where: { submissionId }, order: [['id', 'ASC']], limit: 5 });
      const warnings: string[] = [];
      const documents: OcrDocument[] = [];

      for (const file of files) {
        const storagePath = String(file.get('storagePath') ?? '');
        const fileName = String(file.get('fileName') ?? 'document');
        if (!storagePath) {
          warnings.push(`Missing storage path for ${fileName}`);
          continue;
        }

        const buffer = await readStoragePath(storagePath);
        if (!buffer || buffer.length === 0) {
          warnings.push(`Unable to read ${fileName}`);
          continue;
        }

        try {
          const result = await runOcr(buffer, { fileName });
          documents.push({ fileName, storagePath, text: String(result.text ?? '').trim() });
        } catch (err: any) {
          warnings.push(`OCR failed for ${fileName}: ${String(err?.message ?? err)}`);
        }
      }

      // Multi-document packages are concatenated with explicit boundary markers so
      // downstream stages (classification especially) can distinguish the primary
      // submission document from attachments instead of seeing one anonymous blob.
      const withText = documents.filter((d) => d.text);
      const text = sliceText(
        withText
          .map((d, idx) =>
            withText.length > 1
              ? `===== DOCUMENT ${idx + 1} of ${withText.length}: ${d.fileName} =====\n${d.text}`
              : d.text,
          )
          .join('\n\n'),
      );
      const success: OcrSuccess = { submissionId, organizationId, text, documents, warnings };
      await callbacks.onSuccess?.(success);

      return {
        ok: true,
        service: 'ocr',
        text,
        documents: documents.map((d) => ({
          fileName: d.fileName,
          storagePath: d.storagePath,
          textPreview: d.text.slice(0, 500),
          textLength: d.text.length,
        })),
        warnings,
      };
    } catch (err: any) {
      const failure: OcrFailure = { submissionId, error: String(err?.message ?? err) };
      await callbacks.onFailure?.(failure);
      return { ok: false, service: 'ocr', error: failure.error };
    }
  }
}
