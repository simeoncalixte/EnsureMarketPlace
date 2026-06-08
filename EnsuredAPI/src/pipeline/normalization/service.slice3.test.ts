/**
 * Slice 3 NON-DEGRADATION proof for the normalization stage.
 *
 * With a real submission id but NO published schema for its risk class, the stage
 * must behave byte-for-byte as before: the SubmissionDocument write happens, the
 * Slice-3 canonicalization writes a NULL-pinned row, NO validation runs, and the
 * returned envelope is the unchanged `{ ok: true, ... }`.
 *
 * Runs DB-free by mocking the models and the registry resolver.
 */

const canonicalCreate = jest.fn();
const canonicalFindOne = jest.fn();
const docFindOne = jest.fn();
const docCreate = jest.fn();
const schemaFindAll = jest.fn();
const schemaFindByPk = jest.fn();
const resolveMock = jest.fn();

jest.mock('../../db/models', () => ({
  SubmissionDocument: { findOne: docFindOne, create: docCreate },
  CanonicalSubmission: { findOne: canonicalFindOne, create: canonicalCreate },
}));
jest.mock('../../db/models/riskClassSchema.models', () => ({
  RiskClassSchemaVersion: { findAll: schemaFindAll, findByPk: schemaFindByPk },
}));
jest.mock('../registry/resolve', () => ({ resolveRiskClass: resolveMock }));

import { NormalizationService } from './service';

beforeEach(() => {
  jest.clearAllMocks();
  docFindOne.mockResolvedValue(null);
  docCreate.mockResolvedValue({ id: 1 });
  canonicalFindOne.mockResolvedValue(null);
  canonicalCreate.mockImplementation(async (v: Record<string, unknown>) => ({ ...v }));
  schemaFindAll.mockResolvedValue([]); // NO published schema for any scope
});

describe('NormalizationService Slice-3 non-degradation', () => {
  it('no-schema submission ⇒ identical {ok:true} envelope, no validation, NULL pin', async () => {
    const payload = {
      submission: { id: 99, tenantId: 7 },
      extraction: { structuredData: { riskType: 'Hurricane', limit: 3_000_000, lineOfBusiness: 'Property' } },
    };

    const res: any = await new NormalizationService().process(payload);

    // Output envelope unchanged from the legacy contract.
    expect(res.ok).toBe(true);
    expect(res.service).toBe('normalization');
    expect(res.normalized).toMatchObject(payload.extraction.structuredData);
    expect(res.data).toMatchObject(payload.extraction.structuredData);

    // The canonical row was written with a NULL pin (no enforcement).
    expect(canonicalCreate).toHaveBeenCalledTimes(1);
    expect(canonicalCreate.mock.calls[0][0]).toMatchObject({ submissionId: 99, schemaVersionId: null });

    // No compiled-schema load ⇒ no validation ran.
    expect(schemaFindByPk).not.toHaveBeenCalled();
  });

  it('a pinned submission whose data fails validation ⇒ {ok:false} SCHEMA_VALIDATION_FAILED', async () => {
    // Publish a schema requiring a positive `limit`.
    const { compileToJsonSchema } = require('../schema/compile');
    const compiled = compileToJsonSchema({
      schemaVersion: 1,
      pageKey: 'create-coverage',
      title: 'Coverage',
      sections: [
        { key: 'f', label: 'F', order: 1, fields: [{ key: 'limit', label: 'Limit', type: 'number', order: 1, required: true, canonicalKey: 'limit', constraints: { min: 0 } }] },
      ],
    });
    schemaFindAll.mockResolvedValue([{ id: 5, schemaVersion: 1, status: 'published' }]);
    schemaFindByPk.mockResolvedValue({ id: 5, compiledJsonSchema: compiled });
    resolveMock.mockResolvedValue({ schemaVersionId: 5, lineOfBusinessCode: 'property', lineOfBusinessSubTypeCode: '' });

    const res: any = await new NormalizationService().process({
      submission: { id: 100, tenantId: 7 },
      extraction: { structuredData: { lineOfBusiness: 'Property', limit: -1 } },
    });

    expect(res.ok).toBe(false);
    expect(res.code).toBe('SCHEMA_VALIDATION_FAILED');
    expect(res.schemaVersionId).toBe(5);
    expect(Array.isArray(res.validationErrors)).toBe(true);
  });
});
