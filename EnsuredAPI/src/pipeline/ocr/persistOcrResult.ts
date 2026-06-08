import { SubmissionDocument } from '../../db/models';
import type { OcrSuccess } from './service';

/**
 * Default `OcrService` onSuccess callback: persist the OCR output onto the
 * submission's `SubmissionDocument`, namespaced under `structured_data.ocr`
 * (alongside the other stages' `extraction` / `normalization` / `classification`
 * blocks) so the document shape stays clear about which stage produced what.
 *
 * Best-effort — a persistence failure is logged and swallowed so it never turns a
 * successful OCR run into a failure (e.g. when the output table isn't provisioned).
 */
export async function persistOcrResult(result: OcrSuccess): Promise<void> {
  try {
    const ocr = {
      text: result.text || null,
      documents: result.documents,
      warnings: result.warnings,
      source: 'ocr',
      ocrAt: new Date().toISOString(),
    };

    const doc = await SubmissionDocument.findOne({ where: { submissionId: result.submissionId } });
    if (!doc) {
      await SubmissionDocument.create({
        submissionId: result.submissionId,
        tenantId: result.tenantId,
        structuredData: { ocr },
      });
    } else {
      doc.structuredData = { ...(doc.structuredData ?? {}), ocr };
      await doc.save();
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `persistOcrResult: failed to persist OCR text for submission ${result.submissionId}:`,
      err instanceof Error ? err.message : err,
    );
  }
}
