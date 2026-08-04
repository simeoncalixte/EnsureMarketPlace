// Mock DB models so the removal/impact logic runs without a database.
jest.mock('../../../db/models', () => ({
  PageTemplate: { findOne: jest.fn() },
  SubmissionOutput: { findAll: jest.fn() },
  SchemaOptionSet: { findOne: jest.fn() },
  SchemaOptionSetItem: { destroy: jest.fn() },
}));

import { PageTemplate, SchemaOptionSet, SchemaOptionSetItem, SubmissionOutput } from '../../../db/models';
import { computeFieldImpact, removeCreateCoverageTemplateField, removeInsuredSubjectTemplateField } from './fieldRemoval';

const templateFindOne = PageTemplate.findOne as unknown as jest.Mock;
const outputFindAll = SubmissionOutput.findAll as unknown as jest.Mock;
const optionSetFindOne = SchemaOptionSet.findOne as unknown as jest.Mock;
const optionItemDestroy = SchemaOptionSetItem.destroy as unknown as jest.Mock;

const definition = () => ({
  schemaVersion: 1,
  pageKey: 'create-coverage',
  title: 'Create Coverage — Ocean Marine',
  sections: [
    {
      key: 'general-information',
      label: 'General Information',
      order: 1,
      fields: [
        { key: 'namedInsured', label: 'Named Insured', type: 'text', order: 1, required: true, origin: 'base' },
        { key: 'policyNumber', label: 'Policy Number', type: 'text', order: 2, origin: 'ai' },
        { key: 'lineOfBusinessSubType', label: 'Sub-Type', type: 'select', order: 3, origin: 'ai', optionSetKey: 'ocean-marine.general-information.lineOfBusinessSubType' },
      ],
    },
  ],
});

// A SubmissionOutput whose generated snapshot populates `policyNumber`.
const outputWith = (submissionId: number, fieldKey: string, value: unknown) => ({
  submissionId,
  structuredData: {
    schemaGeneration: {
      schema: { sections: [{ key: 'general-information', fields: [{ key: fieldKey, value }] }] },
    },
  },
});

beforeEach(() => {
  templateFindOne.mockReset();
  outputFindAll.mockReset().mockResolvedValue([]);
  optionSetFindOne.mockReset().mockResolvedValue(null);
  optionItemDestroy.mockReset().mockResolvedValue(0);
});

const baseParams = {
  organizationId: 4,
  lineOfBusinessCode: 'ocean_marine',
  lineOfBusinessSubTypeCode: '',
  sectionKey: 'general-information',
};

describe('removeCreateCoverageTemplateField', () => {
  it('removes an AI, non-required field and persists the mutated template', async () => {
    const save = jest.fn(async function (this: any) { return this; });
    templateFindOne.mockResolvedValue({ definitionJson: definition(), save });
    outputFindAll.mockResolvedValue([
      outputWith(14, 'policyNumber', 'POL-1'),
      outputWith(15, 'policyNumber', ''), // blank -> not counted
      outputWith(16, 'policyNumber', 'POL-2'),
    ]);

    const result = await removeCreateCoverageTemplateField({ ...baseParams, fieldKey: 'policyNumber' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Field gone; the base + other fields preserved.
    const keys = result.template.sections[0].fields.map((f: any) => f.key);
    expect(keys).toEqual(['namedInsured', 'lineOfBusinessSubType']);
    // Impact reported (data preserved, never deleted).
    expect(result.impact.dependentSubmissionCount).toBe(2);
    expect(result.impact.sampleSubmissionIds).toEqual([14, 16]);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('cleans up the orphaned option set when removing a choice field', async () => {
    const save = jest.fn(async function (this: any) { return this; });
    templateFindOne.mockResolvedValue({ definitionJson: definition(), save });
    const headerDestroy = jest.fn();
    optionSetFindOne.mockResolvedValue({ id: 7, destroy: headerDestroy });

    const result = await removeCreateCoverageTemplateField({ ...baseParams, fieldKey: 'lineOfBusinessSubType' });

    expect(result.ok).toBe(true);
    expect(optionItemDestroy).toHaveBeenCalledWith({ where: { optionSetId: 7 } });
    expect(headerDestroy).toHaveBeenCalledTimes(1);
  });

  it('refuses to remove a base scaffold field (403/forbidden) and does not save', async () => {
    const save = jest.fn();
    templateFindOne.mockResolvedValue({ definitionJson: definition(), save });

    const result = await removeCreateCoverageTemplateField({ ...baseParams, fieldKey: 'namedInsured' });

    expect(result).toMatchObject({ ok: false, code: 'forbidden' });
    expect(save).not.toHaveBeenCalled();
  });

  it('removes a required AI-origin field (required no longer protects AI fields)', async () => {
    const def = definition();
    def.sections[0].fields[1].required = true; // policyNumber (ai) now required
    const save = jest.fn(async function (this: any) { return this; });
    templateFindOne.mockResolvedValue({ definitionJson: def, save });

    const result = await removeCreateCoverageTemplateField({ ...baseParams, fieldKey: 'policyNumber' });

    expect(result.ok).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('returns not_found when the org has no template', async () => {
    templateFindOne.mockResolvedValue(null);
    const result = await removeCreateCoverageTemplateField({ ...baseParams, fieldKey: 'policyNumber' });
    expect(result).toMatchObject({ ok: false, code: 'not_found' });
  });

  it('returns not_found when the field is absent from the section', async () => {
    templateFindOne.mockResolvedValue({ definitionJson: definition(), save: jest.fn() });
    const result = await removeCreateCoverageTemplateField({ ...baseParams, fieldKey: 'doesNotExist' });
    expect(result).toMatchObject({ ok: false, code: 'not_found' });
  });
});

describe('removeInsuredSubjectTemplateField (subject path)', () => {
  // A subject template: a protected Location field (base) + a removable detail field (ai).
  const subjectDef = () => ({
    schemaVersion: 1,
    pageKey: 'insured-subjects',
    title: 'Insured Subjects',
    sections: [
      {
        key: 'insured-subject-location',
        label: 'Location',
        order: 1,
        fields: [{ key: 'city', label: 'City', type: 'text', order: 1, origin: 'base' }],
      },
      {
        key: 'insured-subject-details',
        label: 'Subject Details',
        order: 2,
        fields: [{ key: 'occupancy', label: 'Occupancy', type: 'text', order: 1, origin: 'ai' }],
      },
    ],
  });

  it('removes an ai subject-detail field, targets the insured-subjects template, and skips impact', async () => {
    const save = jest.fn(async function (this: any) { return this; });
    templateFindOne.mockResolvedValue({ definitionJson: subjectDef(), save });

    const result = await removeInsuredSubjectTemplateField({
      organizationId: 4,
      lineOfBusinessCode: 'ocean_marine',
      lineOfBusinessSubTypeCode: '',
      sectionKey: 'insured-subject-details',
      fieldKey: 'occupancy',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.impact.dependentSubmissionCount).toBe(0); // impact skipped
    expect(outputFindAll).not.toHaveBeenCalled(); // no snapshot scan for subjects
    expect(templateFindOne.mock.calls[0][0].where.pageKey).toBe('insured-subjects');
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('refuses to remove a base Location field', async () => {
    templateFindOne.mockResolvedValue({ definitionJson: subjectDef(), save: jest.fn() });
    const result = await removeInsuredSubjectTemplateField({
      organizationId: 4,
      lineOfBusinessCode: 'ocean_marine',
      lineOfBusinessSubTypeCode: '',
      sectionKey: 'insured-subject-location',
      fieldKey: 'city',
    });
    expect(result).toMatchObject({ ok: false, code: 'forbidden' });
  });

  it('returns not_found (tolerated by UI) when the field is submission-local / absent from the org template', async () => {
    templateFindOne.mockResolvedValue(null);
    const result = await removeInsuredSubjectTemplateField({
      organizationId: 4,
      lineOfBusinessCode: 'ocean_marine',
      lineOfBusinessSubTypeCode: '',
      sectionKey: 'insured-subject-details',
      fieldKey: 'occupancy',
    });
    expect(result).toMatchObject({ ok: false, code: 'not_found' });
  });
});

describe('computeFieldImpact', () => {
  it('counts only submissions whose snapshot has a populated value for the field', async () => {
    outputFindAll.mockResolvedValue([
      outputWith(1, 'policyNumber', 'POL-A'),
      outputWith(2, 'policyNumber', null), // null -> not counted
      outputWith(3, 'policyNumber', 0), // zero IS a value -> counted
      { submissionId: 4, structuredData: {} }, // no schema -> skipped
    ]);

    const impact = await computeFieldImpact(4, 'general-information', 'policyNumber');

    expect(impact.dependentSubmissionCount).toBe(2);
    expect(impact.sampleSubmissionIds).toEqual([1, 3]);
  });
});
