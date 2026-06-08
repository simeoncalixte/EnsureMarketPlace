import { SubmissionDocument } from '../../db/models';
import { ValidationResult } from './types';

/**
 * Persistence seam for validation output. Keeping this behind an interface lets
 * the service stay free of Sequelize specifics and be unit-tested with a fake.
 */
export interface SubmissionDocumentRepository {
  upsertValidation(submissionId: number, tenantId: number | null, validation: ValidationResult): Promise<void>;
}

/**
 * Default repository backed by the SubmissionDocument model. Merges the
 * validation block into the earliest document for the submission, creating one
 * when none exists.
 */
export const sequelizeSubmissionDocumentRepository: SubmissionDocumentRepository = {
  async upsertValidation(submissionId, tenantId, validation) {
    const doc = await SubmissionDocument.findOne({ where: { submissionId }, order: [['id', 'ASC']] });
    if (!doc) {
      await SubmissionDocument.create({ submissionId, tenantId, structuredData: { validation } });
      return;
    }
    doc.structuredData = { ...(doc.structuredData ?? {}), validation };
    await doc.save();
  },
};
