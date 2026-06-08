/**
 * Slice 3 service-level tests with the DB and the registry mocked out, so they run
 * without Postgres. They prove the end-to-end wiring of `canonicalizeAndPin`:
 *   - no-op (no published schema) leaves the pin NULL and skips enforcement,
 *   - a pinned + valid submission passes,
 *   - a pinned + invalid submission reports enforcement_failed,
 *   - replay reuses the existing pin (no re-resolution),
 *   - an unmappable LOB yields no pin.
 */

jest.mock('../../db/models', () => ({
  CanonicalSubmission: { findOne: jest.fn(), create: jest.fn() },
}));

jest.mock('../../db/models/riskClassSchema.models', () => ({
  RiskClassSchemaVersion: { findAll: jest.fn(), findByPk: jest.fn() },
}));

jest.mock('../registry/resolve', () => ({
  resolveRiskClass: jest.fn(),
}));

import { CanonicalSubmission } from '../../db/models';
import { RiskClassSchemaVersion } from '../../db/models/riskClassSchema.models';
import { resolveRiskClass } from '../registry/resolve';
import { compileToJsonSchema } from '../schema/compile';
import type { PageTemplateDefinition } from '../../db/models/pageTemplates.models';
import { canonicalizeAndPin } from './service';

const findOne = CanonicalSubmission.findOne as unknown as jest.Mock;
const create = CanonicalSubmission.create as unknown as jest.Mock;
const findAll = RiskClassSchemaVersion.findAll as unknown as jest.Mock;
const findByPk = RiskClassSchemaVersion.findByPk as unknown as jest.Mock;
const resolve = resolveRiskClass as unknown as jest.Mock;

const compiledSchema = compileToJsonSchema({
  schemaVersion: 1,
  pageKey: 'create-coverage',
  title: 'Coverage',
  sections: [
    {
      key: 'fin',
      label: 'Financials',
      order: 1,
      fields: [{ key: 'limit', label: 'Limit', type: 'number', order: 1, required: true, canonicalKey: 'limit', constraints: { min: 0 } }],
    },
  ],
} as unknown as PageTemplateDefinition);

function genericResolution(overrides: Record<string, unknown> = {}) {
  return {
    lineOfBusinessCode: 'property',
    lineOfBusinessSubTypeCode: '',
    schemaVersionId: null,
    riskModelingMethod: 'generic_burning_cost',
    ratingMethod: 'generic_loss_ratio',
    appetiteDimensions: {},
    requiredDataFields: [],
    methodParams: {},
    resolvedFrom: 'generic_default',
    ...overrides,
  };
}

beforeEach(() => {
  findOne.mockReset();
  create.mockReset();
  findAll.mockReset();
  findByPk.mockReset();
  resolve.mockReset();
  // Default: brand-new submission, create echoes back the values.
  findOne.mockResolvedValue(null);
  create.mockImplementation(async (values: Record<string, unknown>) => ({ ...values }));
  resolve.mockResolvedValue(genericResolution());
});

describe('canonicalizeAndPin (Slice 3, DB + registry mocked)', () => {
  it('(no-op) unmappable LOB ⇒ no pin, no enforcement, no schema lookup', async () => {
    const out = await canonicalizeAndPin({
      submissionId: 1,
      tenantId: 7,
      data: { lineOfBusiness: 'utterly unknown line', limit: -999 },
    });

    expect(out).toEqual({ status: 'skipped', reason: 'no_lob' });
    // Pin resolution is short-circuited before any schema query.
    expect(findAll).not.toHaveBeenCalled();
    expect(resolve).not.toHaveBeenCalled();
    // Canonical row still written, with a NULL pin and NULL codes.
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0]).toMatchObject({
      submissionId: 1,
      schemaVersionId: null,
      lineOfBusinessCode: null,
    });
  });

  it('(no-op) mappable LOB but no published schema ⇒ no pin, no enforcement', async () => {
    findAll.mockResolvedValue([]); // nothing published for this scope

    const out = await canonicalizeAndPin({
      submissionId: 2,
      tenantId: 7,
      data: { lineOfBusiness: 'Property', limit: -1 }, // invalid value, but never validated
    });

    expect(out).toEqual({ status: 'skipped', reason: 'no_published_version' });
    expect(findByPk).not.toHaveBeenCalled(); // no compiled schema load
    expect(create.mock.calls[0][0]).toMatchObject({ schemaVersionId: null, lineOfBusinessCode: 'property' });
  });

  it('(pinned + valid) ⇒ pinned & enforced ok', async () => {
    findAll.mockResolvedValue([{ id: 10, schemaVersion: 1, status: 'published' }]);
    findByPk.mockResolvedValue({ id: 10, compiledJsonSchema: compiledSchema });

    const out = await canonicalizeAndPin({
      submissionId: 3,
      tenantId: 7,
      data: { lineOfBusiness: 'Property', limit: 5000 },
    });

    expect(out).toEqual({ status: 'pinned', schemaVersionId: 10, enforced: true });
    expect(create.mock.calls[0][0]).toMatchObject({ schemaVersionId: 10, lineOfBusinessCode: 'property' });
  });

  it('(pinned + invalid) ⇒ enforcement_failed with errors', async () => {
    findAll.mockResolvedValue([{ id: 11, schemaVersion: 1, status: 'published' }]);
    findByPk.mockResolvedValue({ id: 11, compiledJsonSchema: compiledSchema });

    const out = await canonicalizeAndPin({
      submissionId: 4,
      tenantId: 7,
      data: { lineOfBusiness: 'Property', limit: -42 }, // violates min:0
    });

    expect(out.status).toBe('enforcement_failed');
    if (out.status === 'enforcement_failed') {
      expect(out.schemaVersionId).toBe(11);
      expect(out.errors.length).toBeGreaterThan(0);
    }
  });

  it('(replay) reuses an existing pin and does NOT re-resolve or re-query candidates', async () => {
    findOne.mockResolvedValue({
      submissionId: 5,
      schemaVersionId: 77, // already pinned
      lineOfBusinessCode: 'property',
      lineOfBusinessSubTypeCode: null,
      data: {},
      save: jest.fn().mockResolvedValue(undefined),
    });
    findByPk.mockResolvedValue({ id: 77, compiledJsonSchema: compiledSchema });

    const out = await canonicalizeAndPin({
      submissionId: 5,
      tenantId: 7,
      data: { lineOfBusiness: 'Property', limit: 100 },
    });

    expect(out).toEqual({ status: 'pinned', schemaVersionId: 77, enforced: true });
    // Replay must NOT re-resolve the registry nor re-query candidate versions.
    expect(resolve).not.toHaveBeenCalled();
    expect(findAll).not.toHaveBeenCalled();
    // It loads the ORIGINAL pinned version's compiled schema (77), not a new one.
    expect(findByPk).toHaveBeenCalledWith(77);
  });

  it('(degrade) registry resolution throwing ⇒ no pin, no crash', async () => {
    resolve.mockRejectedValue(new Error('registry down'));
    findAll.mockRejectedValue(new Error('db down'));

    const out = await canonicalizeAndPin({
      submissionId: 6,
      tenantId: 7,
      data: { lineOfBusiness: 'Property', limit: 10 },
    });

    expect(out).toEqual({ status: 'skipped', reason: 'no_published_version' });
  });
});
