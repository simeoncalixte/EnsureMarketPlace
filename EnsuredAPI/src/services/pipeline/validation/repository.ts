import { SubmissionOutput } from '../../../db/models';
import { ValidationResult } from './types';

/**
 * Persistence seam for validation output. Keeping this behind an interface lets
 * the service stay free of Sequelize specifics and be unit-tested with a fake.
 */
export interface SubmissionDocumentRepository {
  upsertValidation(submissionId: number, organizationId: number | null, validation: ValidationResult): Promise<void>;
}

/**
 * Default repository backed by the SubmissionOutput model. Merges the
 * validation block into the earliest document for the submission, creating one
 * when none exists.
 */
export const sequelizeSubmissionDocumentRepository: SubmissionDocumentRepository = {
  async upsertValidation(submissionId, organizationId, validation) {
    const doc = await SubmissionOutput.findOne({ where: { submissionId }, order: [['id', 'ASC']] });
    if (!doc) {
      await SubmissionOutput.create({ submissionId, organizationId, structuredData: { validation } });
      return;
    }
    doc.structuredData = { ...(doc.structuredData ?? {}), validation };
    await doc.save();
  },
};
