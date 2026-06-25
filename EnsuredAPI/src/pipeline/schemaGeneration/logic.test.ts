import {
  ALLOWED_FIELD_TYPES,
  adoptOrgTemplateAsBase,
  buildBaselineSchema,
  coerceFormSchema,
  extractOptionSets,
  gatherContext,
  mergeTemplateDefinitions,
  prefillSchema,
  toStorableTemplate,
} from './logic';
import { SuggestedFormDefinition } from './types';

const PAYLOAD = {
  submission: { id: 7, organizationId: 3 },
  classification: {
    ok: true,
    service: 'classification',
    lineOfBusinessCode: 'property',
    lineOfBusinessLabel: 'Property',
    lineOfBusinessSubTypeCode: 'commercial',
    lineOfBusinessSubTypeLabel: 'Commercial Property',
  },
  extraction: {
    ok: true,
    service: 'extraction',
    structuredData: {
      limit: 9_000_000,
      deductible: 250_000,
      riskType: 'hurricane',
      triggerType: 'parametric',
      expectedYield: 0.09,
      effectiveDate: '2026-01-01',
      propertyLocation: 'Miami, FL',
      subjectCount: 2,
      subjects: [
        { label: 'Warehouse #3', insuredValue: 5_000_000 },
        { label: 'HQ Office', insuredValue: 4_000_000 },
      ],
      source: 'gemini_extraction',
    },
  },
  validation: {
    ok: true,
    service: 'validation',
    decision: 'PASS',
    schemaValidation: { missingRequired: ['effectiveDate'], dataQualityScore: 80 },
  },
};

describe('gatherContext', () => {
  it('distills classification + extraction + validation outputs into a flat context', () => {
    const ctx = gatherContext(PAYLOAD);
    expect(ctx.submissionId).toBe(7);
    expect(ctx.organizationId).toBe(3);
    expect(ctx.lineOfBusinessCode).toBe('property');
    expect(ctx.lineOfBusinessLabel).toBe('Property');
    expect(ctx.riskType).toBe('hurricane');
    expect(ctx.triggerType).toBe('parametric');
    expect(ctx.limit).toBe(9_000_000);
    expect(ctx.expectedYield).toBeCloseTo(0.09);
    expect(ctx.subjectCount).toBe(2);
    expect(ctx.subjects).toHaveLength(2);
    expect(ctx.validationDecision).toBe('PASS');
    expect(ctx.missingRequired).toEqual(['effectiveDate']);
  });

  it('does not treat the extraction envelope keys as entity fields', () => {
    const ctx = gatherContext(PAYLOAD);
    // `source`/`service`/`ok` must not leak into the context as data
    expect((ctx as unknown as Record<string, unknown>).source).toBeUndefined();
  });

  it('tolerates an empty / missing payload', () => {
    const ctx = gatherContext(undefined);
    expect(ctx.submissionId).toBeNull();
    expect(ctx.subjects).toEqual([]);
    expect(ctx.subjectCount).toBeNull();
  });
});

describe('buildBaselineSchema', () => {
  it('is the full create-coverage page structure (all 8 sections, base-tagged)', () => {
    const schema = buildBaselineSchema(gatherContext(PAYLOAD));
    const keys = schema.sections.map((s) => s.key);
    expect(keys).toEqual([
      'general-information',
      'financials',
      'insured-subjects',
      'documents',
      'tranche-structure',
      'validation',
      'submission',
      'signing',
    ]);
    // Every section (and its fields) is tagged base.
    for (const section of schema.sections) {
      expect(section.origin).toBe('base');
      section.fields.forEach((f, i) => {
        expect(ALLOWED_FIELD_TYPES).toContain(f.type);
        expect(f.origin).toBe('base');
        expect(f.order).toBe(i + 1);
      });
    }
  });

  it('renders workflow sections via their existing components, not dynamic fields', () => {
    const schema = buildBaselineSchema(gatherContext(PAYLOAD));
    const components = Object.fromEntries(schema.sections.map((s) => [s.key, s.component]));
    expect(components['insured-subjects']).toBe('subjects');
    expect(components['documents']).toBe('documents');
    expect(components['tranche-structure']).toBe('tranches');
    expect(components['validation']).toBe('validation');
    expect(components['general-information']).toBeUndefined(); // dynamic data section
  });

  it('titles the form by the line of business', () => {
    expect(buildBaselineSchema(gatherContext(PAYLOAD)).title).toBe('Create Coverage — Property');
  });
});

describe('coerceFormSchema (extend base, never override)', () => {
  const baseline = buildBaselineSchema(gatherContext(PAYLOAD));

  it('extends a base data section with new AI fields and preserves the base fields', () => {
    const out = coerceFormSchema(
      {
        sections: [
          {
            key: 'financials', // extend the base financials section
            label: 'Financials',
            fields: [
              { key: 'coverageLimit', label: 'Coverage Limit', type: 'currency' }, // duplicate of base -> ignored
              { key: 'reinstatementPremium', label: 'Reinstatement Premium', type: 'currency' }, // new
            ],
          },
        ],
      },
      baseline,
    );
    const financials = out.sections.find((s) => s.key === 'financials')!;
    const keys = financials.fields.map((f) => f.key);
    // Base field preserved exactly once; AI field appended and tagged ai.
    expect(keys.filter((k) => k === 'coverageLimit')).toHaveLength(1);
    expect(keys).toContain('reinstatementPremium');
    expect(financials.fields.find((f) => f.key === 'coverageLimit')!.origin).toBe('base');
    expect(financials.fields.find((f) => f.key === 'reinstatementPremium')!.origin).toBe('ai');
  });

  it('adds a wholly new AI section (tagged ai) after the base sections', () => {
    const out = coerceFormSchema(
      {
        sections: [
          {
            key: 'parametric-trigger',
            label: 'Parametric Trigger',
            fields: [
              { key: 'indexSource', label: 'Index / Oracle Source', type: 'text' },
              { key: 'payoutTrigger', label: 'Payout Trigger Value', type: 'currency' },
            ],
          },
        ],
      },
      baseline,
    );
    const keys = out.sections.map((s) => s.key);
    // All 8 base keys still present, plus the new AI section last.
    expect(keys.slice(0, 8)).toEqual(baseline.sections.map((s) => s.key));
    expect(keys).toContain('parametric-trigger');
    expect(out.sections.find((s) => s.key === 'parametric-trigger')!.origin).toBe('ai');
  });

  it('refuses to field-extend a component (workflow) base section', () => {
    const out = coerceFormSchema(
      { sections: [{ key: 'validation', label: 'Validation', fields: [{ key: 'hacked', label: 'Hacked', type: 'text' }] }] },
      baseline,
    );
    const validation = out.sections.find((s) => s.key === 'validation')!;
    expect(validation.fields).toHaveLength(0); // unchanged component section
  });

  it('clamps unknown field types and coerces select options on new sections', () => {
    const out = coerceFormSchema(
      {
        sections: [
          {
            key: 'extra',
            label: 'Extra',
            fields: [
              { key: 'weird', label: 'Weird', type: 'galaxy-brain' },
              { key: 'pick', label: 'Pick', type: 'select', options: ['Alpha', { value: 'b', label: 'Beta' }] },
            ],
          },
        ],
      },
      baseline,
    );
    const extra = out.sections.find((s) => s.key === 'extra')!;
    expect(extra.fields[0].type).toBe('text');
    expect(extra.fields[1].type).toBe('select');
    expect(extra.fields[1].options).toEqual([
      { value: 'alpha', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ]);
  });

  it('returns exactly the base when given junk', () => {
    const out: SuggestedFormDefinition = coerceFormSchema('not an object', baseline);
    expect(out.sections.map((s) => s.key)).toEqual(baseline.sections.map((s) => s.key));
  });

  it('always stamps the canonical pageKey and schemaVersion', () => {
    const out = coerceFormSchema({ pageKey: 'evil', schemaVersion: 99, sections: [] }, baseline);
    expect(out.pageKey).toBe('create-coverage');
    expect(out.schemaVersion).toBe(1);
  });
});

describe('prefillSchema', () => {
  it('fills field values from the submission by canonical key', () => {
    const ctx = gatherContext(PAYLOAD);
    const filled = prefillSchema(buildBaselineSchema(ctx), ctx);
    const financials = filled.sections.find((s) => s.key === 'financials')!;
    expect(financials.fields.find((f) => f.canonicalKey === 'limit')!.value).toBe(9_000_000);
    const deal = filled.sections.find((s) => s.key === 'general-information')!;
    expect(deal.fields.find((f) => f.canonicalKey === 'effectiveDate')!.value).toBe('2026-01-01');
    // A field with no matching extracted value stays unset.
    expect(deal.fields.find((f) => f.key === 'dealName')!.value).toBeUndefined();
  });
});

describe('adoptOrgTemplateAsBase', () => {
  it('uses the org template sections as base and appends missing component sections', () => {
    const ctx = gatherContext(PAYLOAD);
    const orgDef = {
      schemaVersion: 1,
      pageKey: 'create-coverage',
      title: 'Acme Property Coverage',
      sections: [
        { key: 'deal-parameters', label: 'Deal', order: 1, fields: [{ key: 'dealName', label: 'Deal Name', type: 'text', order: 1 }] },
        { key: 'acme-extras', label: 'Acme Extras', order: 2, fields: [{ key: 'broker', label: 'Broker', type: 'text', order: 1 }] },
      ],
    };
    const base = adoptOrgTemplateAsBase(orgDef as never, ctx);
    const keys = base.sections.map((s) => s.key);
    expect(base.title).toBe('Acme Property Coverage');
    expect(keys).toContain('acme-extras');
    // The legacy 'deal-parameters' key is normalized to its successor.
    expect(keys).toContain('general-information');
    expect(keys).not.toContain('deal-parameters');
    // Workflow component sections from the hardcoded base are appended.
    expect(keys).toContain('tranche-structure');
    expect(keys).toContain('documents');
    expect(keys).toContain('signing');
    // Org sections are tagged base.
    expect(base.sections.find((s) => s.key === 'acme-extras')!.origin).toBe('base');
  });
});

describe('toStorableTemplate', () => {
  it('drops per-submission prefilled values but keeps structure', () => {
    const schema: SuggestedFormDefinition = {
      schemaVersion: 1,
      pageKey: 'create-coverage',
      title: 'T',
      sections: [
        {
          key: 'deal-parameters',
          label: 'Deal',
          order: 1,
          fields: [
            { key: 'dealName', label: 'Deal Name', type: 'text', order: 1, value: 'Acme-1' },
            { key: 'perilType', label: 'Peril', type: 'text', order: 2, canonicalKey: 'riskType', value: 'flood' },
          ],
        },
      ],
    };

    const stored = toStorableTemplate(schema);
    const fields = stored.sections[0].fields;
    expect(fields.every((f) => !('value' in f))).toBe(true);
    // Structure (keys, types, canonicalKey) is preserved.
    expect(fields.map((f) => f.key)).toEqual(['dealName', 'perilType']);
    expect(fields[1].canonicalKey).toBe('riskType');
    // Input is not mutated.
    expect(schema.sections[0].fields[0].value).toBe('Acme-1');
  });
});

describe('mergeTemplateDefinitions', () => {
  const existing: SuggestedFormDefinition = {
    schemaVersion: 1,
    pageKey: 'create-coverage',
    title: 'Existing',
    sections: [
      { key: 'deal-parameters', label: 'Deal', order: 1, fields: [{ key: 'dealName', label: 'Deal Name', type: 'text', order: 1 }] },
      { key: 'acme-extras', label: 'Acme Extras', order: 2, fields: [{ key: 'broker', label: 'Broker', type: 'text', order: 1 }] },
    ],
  };

  it('appends new fields to overlapping sections and adds new sections, removing nothing', () => {
    const incoming: SuggestedFormDefinition = {
      schemaVersion: 1,
      pageKey: 'create-coverage',
      title: 'Incoming',
      sections: [
        {
          key: 'deal-parameters',
          label: 'Deal (renamed)',
          order: 1,
          fields: [
            { key: 'dealName', label: 'Deal Name', type: 'text', order: 1 }, // duplicate — ignored
            { key: 'voyageRoute', label: 'Voyage Route', type: 'text', order: 2, origin: 'ai' },
          ],
        },
        { key: 'parametric-trigger', label: 'Parametric Trigger', order: 2, origin: 'ai', fields: [{ key: 'oracleSource', label: 'Oracle', type: 'text', order: 1 }] },
      ],
    };

    const merged = mergeTemplateDefinitions(existing, incoming);
    const byKey = Object.fromEntries(merged.sections.map((s) => [s.key, s]));

    // Overlapping section keeps existing metadata, gains only the new field.
    // Both sides used the legacy 'deal-parameters' key — merged under its successor.
    expect(byKey['general-information'].label).toBe('Deal');
    expect(byKey['general-information'].fields.map((f) => f.key)).toEqual(['dealName', 'voyageRoute']);
    // Pre-existing section untouched.
    expect(byKey['acme-extras'].fields.map((f) => f.key)).toEqual(['broker']);
    // New section appended.
    expect(byKey['parametric-trigger']).toBeDefined();
  });

  it('is a no-op when the incoming form adds nothing new', () => {
    const merged = mergeTemplateDefinitions(existing, existing);
    expect(merged.sections.map((s) => s.key)).toEqual(['general-information', 'acme-extras']);
    expect(merged.sections[0].fields.map((f) => f.key)).toEqual(['dealName']);
  });
});

describe('extractOptionSets', () => {
  const ctx = gatherContext(PAYLOAD); // lineOfBusinessCode: 'property'

  const schemaWith = (fields: any[]): SuggestedFormDefinition => ({
    schemaVersion: 1,
    pageKey: 'create-coverage',
    title: 'x',
    sections: [{ key: 'coverage-terms', label: 'Coverage Terms', order: 1, fields }],
  });

  it('lifts select/radio options into sets and replaces them with an optionSetKey', () => {
    const { schema, optionSets } = extractOptionSets(
      schemaWith([
        { key: 'basis', label: 'Basis', type: 'select', order: 1, options: [{ value: 'occ', label: 'Occurrence' }] },
        { key: 'mode', label: 'Mode', type: 'radio', order: 2, options: [{ value: 'a', label: 'A' }] },
      ]),
      ctx,
    );

    expect(optionSets).toEqual([
      {
        optionSetKey: 'property.coverage-terms.basis',
        label: 'Basis',
        fieldKey: 'basis',
        sectionKey: 'coverage-terms',
        items: [{ value: 'occ', label: 'Occurrence' }],
      },
      {
        optionSetKey: 'property.coverage-terms.mode',
        label: 'Mode',
        fieldKey: 'mode',
        sectionKey: 'coverage-terms',
        items: [{ value: 'a', label: 'A' }],
      },
    ]);

    const [basis, mode] = schema.sections[0].fields;
    expect(basis.optionSetKey).toBe('property.coverage-terms.basis');
    expect('options' in basis).toBe(false);
    // Option VALUES are preserved as an enum constraint for the publish path.
    expect(basis.constraints?.enumValues).toEqual(['occ']);
    expect(mode.optionSetKey).toBe('property.coverage-terms.mode');
  });

  it('leaves non-choice fields and optionless choice fields untouched', () => {
    const { schema, optionSets } = extractOptionSets(
      schemaWith([
        { key: 'note', label: 'Note', type: 'text', order: 1 },
        { key: 'empty', label: 'Empty', type: 'select', order: 2 },
      ]),
      ctx,
    );

    expect(optionSets).toEqual([]);
    expect(schema.sections[0].fields.every((f) => !('optionSetKey' in f))).toBe(true);
  });
});
