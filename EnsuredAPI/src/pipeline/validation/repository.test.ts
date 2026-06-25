jest.mock('../../db/models', () => ({
  SubmissionOutput: { findOne: jest.fn(), create: jest.fn() },
}));

import { SubmissionOutput } from '../../db/models';
import { sequelizeSubmissionDocumentRepository } from './repository';
import { ValidationResult } from './types';

const findOne = SubmissionOutput.findOne as unknown as jest.Mock;
const create = SubmissionOutput.create as unknown as jest.Mock;

const validation = { decision: 'PASS' } as unknown as ValidationResult;

describe('sequelizeSubmissionDocumentRepository.upsertValidation', () => {
  beforeEach(() => {
    findOne.mockReset();
    create.mockReset();
  });

  test('creates a document when none exists', async () => {
    findOne.mockResolvedValue(null);
    await sequelizeSubmissionDocumentRepository.upsertValidation(5, 9, validation);
    expect(create).toHaveBeenCalledWith({ submissionId: 5, organizationId: 9, structuredData: { validation } });
  });

  test('merges into the existing document and saves', async () => {
    const save = jest.fn();
    const doc: any = { structuredData: { existing: true }, save };
    findOne.mockResolvedValue(doc);

    await sequelizeSubmissionDocumentRepository.upsertValidation(5, null, validation);

    expect(create).not.toHaveBeenCalled();
    expect(doc.structuredData).toEqual({ existing: true, validation });
    expect(save).toHaveBeenCalled();
  });

  test('handles a null structuredData on the existing document', async () => {
    const save = jest.fn();
    const doc: any = { structuredData: null, save };
    findOne.mockResolvedValue(doc);

    await sequelizeSubmissionDocumentRepository.upsertValidation(7, 1, validation);

    expect(doc.structuredData).toEqual({ validation });
    expect(save).toHaveBeenCalled();
  });
});
