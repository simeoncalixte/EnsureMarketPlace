import { SubmissionFile, SubmissionDocument } from '../../db/models';
import { runOcr } from '../connectors/ocr';
import { getS3Object } from '../connectors/s3';
import { classifyDocument } from '../connectors/llm';

export class ClassificationService {
  async process(payload: any): Promise<Record<string, unknown>> {
    const submission = payload?.submission;
    if (!submission || !submission.id) return { ok: false, error: 'missing submission' };
    const submissionId = submission.id;

    // Gather a representative text sample from first file
    let sampleText = '';
    const files = await SubmissionFile.findAll({ where: { submissionId }, limit: 5 });
    for (const f of files) {
      try {
        const storagePath = (f.get('storagePath') as string) ?? '';
        let buf: Buffer | undefined;
        if (storagePath.startsWith('s3://')) {
          const s = storagePath.replace('s3://', '');
          const idx = s.indexOf('/');
          const bucket = s.slice(0, idx);
          const key = s.slice(idx + 1);
          buf = await getS3Object(bucket, key);
        } else {
          try {
            const fs = await import('fs/promises');
            buf = await fs.readFile(storagePath);
          } catch (_) {
            buf = undefined;
          }
        }
        if (buf) {
          const ocrResult = await runOcr(buf);
          sampleText = (ocrResult.text ?? '').slice(0, 4000);
          if (sampleText.length > 0) break;
        }
      } catch (err) {
        // ignore per-file errors
      }
    }

    const classification = await classifyDocument(sampleText || String(submission.source ?? ''));

    // Persist classification into SubmissionDocument row (create or update a doc row)
    let doc = await SubmissionDocument.findOne({ where: { submissionId } });
    if (!doc) {
      doc = await SubmissionDocument.create({ submissionId, tenantId: submission.tenantId ?? null, documentType: classification.document_type ?? null, classificationConfidence: classification.confidence ?? null });
    } else {
      doc.documentType = classification.document_type ?? doc.documentType;
      doc.classificationConfidence = classification.confidence ?? doc.classificationConfidence;
      await doc.save();
    }

    return { ok: true, document_type: classification.document_type, confidence: classification.confidence };
  }
}
