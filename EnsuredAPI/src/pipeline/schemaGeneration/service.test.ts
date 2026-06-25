// Mock DB models so persistence runs without a database.
jest.mock('../../db/models', () => ({
  SubmissionOutput: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() },
  PageTemplate: { findOne: jest.fn(), create: jest.fn() },
  SchemaOptionSet: { findOrCreate: jest.fn(), findOne: jest.fn() },
  SchemaOptionSetItem: { destroy: jest.fn(), bulkCreate: jest.fn() },
}));

import { PageTemplate, SchemaOptionSet, SchemaOptionSetItem, SubmissionOutput } from '../../db/models';
import { SchemaGenerationService, buildBaselineForm, loadSuggestedForm } from './service';
import { SchemaAgent } from './GeminiSchemaProvider';
import { buildBaselineSchema, gatherContext } from './logic';
import { SuggestedFormDefinition } from './types';

const findOne = SubmissionOutput.findOne as unknown as jest.Mock;
const create = SubmissionOutput.create as unknown as jest.Mock;
const templateFindOne = PageTemplate.findOne as unknown as jest.Mock;
const templateCreate = PageTemplate.create as unknown as jest.Mock;
const optionSetFindOrCreate = SchemaOptionSet.findOrCreate as unknown as jest.Mock;
const optionItemDestroy = SchemaOptionSetItem.destroy as unknown as jest.Mock;
const optionItemBulkCreate = SchemaOptionSetItem.bulkCreate as unknown as jest.Mock;

const PAYLOAD = {
  submission: { id: 42, organizationId: 9 },
  classification: { lineOfBusinessCode: 'marine', lineOfBusinessLabel: 'Marine Cargo' },
  extraction: { structuredData: { riskType: 'cargo', subjectCount: 4, subjects: [{ label: 'Container A' }, { label: 'Container B' }] } },
  validation: { decision: 'PASS', schemaValidation: { missingRequired: [] } },
};

beforeEach(() => {
  findOne.mockReset().mockResolvedValue(null);
  create.mockReset().mockResolvedValue({ id: 1 });
  templateFindOne.mockReset().mockResolvedValue(null); // no org template by default
  templateCreate.mockReset().mockResolvedValue({ id: 1 });
  optionSetFindOrCreate.mockReset().mockResolvedValue([{ id: 7, save: jest.fn() }, true]);
  optionItemDestroy.mockReset().mockResolvedValue(0);
  optionItemBulkCreate.mockReset().mockResolvedValue([]);
});

describe('SchemaGenerationService', () => {
  it('uses the agent when available and tags the gemini source', async () => {
    const generate = jest.fn(async ({ baseline }) => baseline);
    const agent: SchemaAgent = { isAvailable: () => true, generate };

    const res: any = await new SchemaGenerationService({ schemaAgent: agent }).process(PAYLOAD);

    expect(res.ok).toBe(true);
    expect(res.service).toBe('schemaGeneration');
    expect(res.source).toBe('gemini_schema');
    expect(res.sectionCount).toBeGreaterThanOrEqual(3);
    expect(res.subjectCount).toBe(4);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1); // persisted
    expect(res.persisted).toBe(true);
  });

  it('falls back to the heuristic baseline when the agent throws', async () => {
    const agent: SchemaAgent = { isAvailable: () => true, generate: jest.fn().mockRejectedValue(new Error('boom')) };

    const res: any = await new SchemaGenerationService({ schemaAgent: agent }).process(PAYLOAD);

    expect(res.ok).toBe(true);
    expect(res.source).toBe('heuristic_schema');
    expect(res.schema.sections.map((s: any) => s.key)).toContain('insured-subjects');
  });

  it('uses the baseline when no agent is available', async () => {
    const agent: SchemaAgent = { isAvailable: () => false, generate: jest.fn() };
    const res: any = await new SchemaGenerationService({ schemaAgent: agent }).process(PAYLOAD);
    expect(res.source).toBe('heuristic_schema');
    expect(agent.generate).not.toHaveBeenCalled();
  });

  it('still returns a schema (persisted=false) when persistence fails', async () => {
    findOne.mockRejectedValue(new Error('db down'));
    const agent: SchemaAgent = { isAvailable: () => false, generate: jest.fn() };

    const res: any = await new SchemaGenerationService({ schemaAgent: agent }).process(PAYLOAD);

    expect(res.ok).toBe(true);
    expect(res.persisted).toBe(false);
  });

  it('matches the deterministic baseline for the same context', async () => {
    const agent: SchemaAgent = { isAvailable: () => false, generate: jest.fn() };
    const res: any = await new SchemaGenerationService({ schemaAgent: agent }).process(PAYLOAD);
    const expected = buildBaselineSchema(gatherContext(PAYLOAD));
    expect(res.schema.sections.map((s: any) => s.key)).toEqual(expected.sections.map((s) => s.key));
  });
});

describe('buildBaselineForm', () => {
  it('returns the full standardized base tailored by line of business', () => {
    const out = buildBaselineForm({ lineOfBusinessLabel: 'Property', subjectCount: 3 });
    expect(out.source).toBe('heuristic_schema');
    expect(out.schema.title).toBe('Create Coverage — Property');
    expect(out.schema.sections.map((s) => s.key)).toEqual([
      'general-information', 'financials', 'insured-subjects', 'documents', 'tranche-structure', 'validation', 'submission', 'signing',
    ]);
    expect(out.schema.sections.find((s) => s.key === 'insured-subjects')?.component).toBe('subjects');
  });

  it('works with no params (generic default)', () => {
    const out = buildBaselineForm();
    expect(out.schema.title).toBe('Create Coverage');
    expect(out.schema.sections.length).toBe(8);
  });
});

describe('SchemaGenerationService org-template reuse', () => {
  it('uses the org template as the base and tags the org_template source', async () => {
    templateFindOne.mockResolvedValue({
      definitionJson: {
        schemaVersion: 1,
        pageKey: 'create-coverage',
        title: 'Acme Marine',
        sections: [
          { key: 'deal-parameters', label: 'Deal', order: 1, fields: [{ key: 'dealName', label: 'Deal Name', type: 'text', order: 1 }] },
          { key: 'acme-extras', label: 'Acme Extras', order: 2, fields: [{ key: 'broker', label: 'Broker', type: 'text', order: 1 }] },
        ],
      },
    });
    const agent: SchemaAgent = { isAvailable: () => false, generate: jest.fn() };

    const res: any = await new SchemaGenerationService({ schemaAgent: agent }).process(PAYLOAD);

    expect(res.source).toBe('org_template');
    const keys = res.schema.sections.map((s: any) => s.key);
    expect(keys).toContain('acme-extras');
    expect(keys).toContain('tranche-structure'); // missing workflow section appended
  });
});

describe('SchemaGenerationService template write-back', () => {
  it('promotes an LLM-generated form into a new LOB-keyed template when none exists', async () => {
    const agent: SchemaAgent = { isAvailable: () => true, generate: jest.fn(async ({ baseline }) => baseline) };

    const res: any = await new SchemaGenerationService({ schemaAgent: agent }).process(PAYLOAD);

    expect(res.templatePersisted).toBe(true);
    expect(templateCreate).toHaveBeenCalledTimes(1);
    const created = templateCreate.mock.calls[0][0];
    expect(created.source).toBe('ai');
    expect(created.status).toBe('published');
    expect(created.pageKey).toBe('create-coverage');
    expect(created.scopeKey).toBe('organization:9');
    expect(created.organizationId).toBe(9);
    expect(created.lineOfBusinessCode).toBe('marine');
    // Stored structure carries no per-submission prefilled values.
    const everyField = created.definitionJson.sections.flatMap((s: any) => s.fields);
    expect(everyField.every((f: any) => !('value' in f))).toBe(true);
  });

  it('extends an existing template append-only instead of overwriting it', async () => {
    const existing = {
      definitionJson: {
        schemaVersion: 1,
        pageKey: 'create-coverage',
        title: 'Acme Marine',
        sections: [
          { key: 'deal-parameters', label: 'Deal', order: 1, fields: [{ key: 'dealName', label: 'Deal Name', type: 'text', order: 1 }] },
          { key: 'acme-extras', label: 'Acme Extras', order: 2, fields: [{ key: 'broker', label: 'Broker', type: 'text', order: 1 }] },
        ],
      },
      publishedAt: null as Date | null,
      save: jest.fn(async function (this: any) { return this; }),
    };
    templateFindOne.mockResolvedValue(existing);

    const tailored: SuggestedFormDefinition = {
      schemaVersion: 1,
      pageKey: 'create-coverage',
      title: 'tailored',
      sections: [
        {
          key: 'deal-parameters',
          label: 'Deal',
          order: 1,
          origin: 'base',
          fields: [
            { key: 'dealName', label: 'Deal Name', type: 'text', order: 1, origin: 'base' },
            { key: 'voyageRoute', label: 'Voyage Route', type: 'text', order: 2, origin: 'ai', value: 'NY-LDN' },
          ],
        },
        {
          key: 'parametric-trigger',
          label: 'Parametric Trigger',
          order: 2,
          origin: 'ai',
          fields: [{ key: 'oracleSource', label: 'Oracle Source', type: 'text', order: 1, origin: 'ai' }],
        },
      ],
    };
    const agent: SchemaAgent = { isAvailable: () => true, generate: jest.fn(async () => tailored) };

    const res: any = await new SchemaGenerationService({ schemaAgent: agent }).process(PAYLOAD);

    expect(res.templatePersisted).toBe(true);
    expect(templateCreate).not.toHaveBeenCalled(); // extended in place, not recreated
    expect(existing.save).toHaveBeenCalledTimes(1);

    const sections = existing.definitionJson.sections;
    const byKey = Object.fromEntries(sections.map((s: any) => [s.key, s]));
    // Nothing removed: the pre-existing section and field survive.
    expect(byKey['acme-extras'].fields.map((f: any) => f.key)).toEqual(['broker']);
    // New field appended onto the overlapping section (legacy key normalized).
    expect(byKey['general-information'].fields.map((f: any) => f.key)).toEqual(['dealName', 'voyageRoute']);
    // Wholly-new AI section appended.
    expect(byKey['parametric-trigger']).toBeDefined();
    // Per-submission values stripped before storage.
    const voyageRoute = byKey['general-information'].fields.find((f: any) => f.key === 'voyageRoute');
    expect('value' in voyageRoute).toBe(false);
  });

  it('lifts choice-field options into option sets and leaves the field referencing them', async () => {
    const tailored: SuggestedFormDefinition = {
      schemaVersion: 1,
      pageKey: 'create-coverage',
      title: 'tailored',
      sections: [
        {
          key: 'parametric-trigger',
          label: 'Parametric Trigger',
          order: 2,
          origin: 'ai',
          fields: [
            {
              key: 'triggerType',
              label: 'Trigger Type',
              type: 'select',
              order: 1,
              origin: 'ai',
              options: [
                { value: 'index', label: 'Index' },
                { value: 'parametric', label: 'Parametric' },
              ],
            },
          ],
        },
      ],
    };
    const agent: SchemaAgent = { isAvailable: () => true, generate: jest.fn(async () => tailored) };

    const res: any = await new SchemaGenerationService({ schemaAgent: agent }).process(PAYLOAD);

    // One set extracted and persisted.
    expect(res.optionSetCount).toBe(1);
    expect(res.optionSetsPersisted).toBe(1);
    expect(optionSetFindOrCreate).toHaveBeenCalledTimes(1);
    expect(optionSetFindOrCreate.mock.calls[0][0].where).toEqual({
      organizationId: 9,
      optionSetKey: 'marine.parametric-trigger.triggerType',
    });
    expect(optionItemBulkCreate).toHaveBeenCalledWith([
      { optionSetId: 7, value: 'index', label: 'Index', order: 1 },
      { optionSetId: 7, value: 'parametric', label: 'Parametric', order: 2 },
    ]);

    // The emitted/persisted field references the set and no longer inlines options.
    const trigger = res.schema.sections
      .find((s: any) => s.key === 'parametric-trigger')
      .fields.find((f: any) => f.key === 'triggerType');
    expect(trigger.optionSetKey).toBe('marine.parametric-trigger.triggerType');
    expect('options' in trigger).toBe(false);
  });

  it('does not write back a template for a pure heuristic baseline', async () => {
    const agent: SchemaAgent = { isAvailable: () => false, generate: jest.fn() };

    const res: any = await new SchemaGenerationService({ schemaAgent: agent }).process(PAYLOAD);

    expect(res.source).toBe('heuristic_schema');
    expect(res.templatePersisted).toBe(false);
    expect(templateCreate).not.toHaveBeenCalled();
  });
});

describe('loadSuggestedForm', () => {
  beforeEach(() => findOne.mockReset());

  it('returns the persisted suggested form for a submission', async () => {
    const schema = buildBaselineSchema(gatherContext(PAYLOAD));
    findOne.mockResolvedValue({ structuredData: { schemaGeneration: { schema, source: 'gemini_schema', generatedAt: 'now' } } });

    const out = await loadSuggestedForm(42);
    expect(out).not.toBeNull();
    expect(out!.source).toBe('gemini_schema');
    expect(out!.schema.sections.length).toBeGreaterThanOrEqual(3);
  });

  it('returns null when the submission has no document or no generated form', async () => {
    findOne.mockResolvedValue(null);
    expect(await loadSuggestedForm(1)).toBeNull();

    findOne.mockResolvedValue({ structuredData: { extraction: {} } });
    expect(await loadSuggestedForm(1)).toBeNull();
  });

  it('returns null for a non-finite id without querying', async () => {
    expect(await loadSuggestedForm(Number.NaN)).toBeNull();
    expect(findOne).not.toHaveBeenCalled();
  });
});
