import {
  compileToJsonSchema,
  computeContentHash,
  resolveFieldCanonicalKey,
  validateCanonicalData,
} from './compile';
import { decidePublish } from './publish';
import type { PageTemplateDefinition } from '../../db/models/pageTemplates.models';

function buildDefinition(): PageTemplateDefinition {
  return {
    schemaVersion: 1,
    pageKey: 'risk-class-cat',
    title: 'Property Cat',
    sections: [
      {
        key: 'core',
        label: 'Core',
        order: 10,
        fields: [
          { key: 'insured_name', label: 'Insured', type: 'text', order: 10, required: true, canonicalKey: 'insured.name' },
          {
            key: 'tiv',
            label: 'Total Insured Value',
            type: 'number',
            order: 20,
            required: true,
            canonicalKey: 'financials.tiv',
            constraints: { min: 0, max: 1_000_000_000, unit: 'USD' },
            feedsModeling: true,
          },
          {
            key: 'construction',
            label: 'Construction',
            type: 'select',
            order: 30,
            options: [
              { label: 'Frame', value: 'frame' },
              { label: 'Masonry', value: 'masonry' },
            ],
            canonicalKey: 'cope.construction',
          },
          {
            key: 'optional_notes',
            label: 'Notes',
            type: 'textarea',
            order: 40,
            required: true,
            canonicalKey: 'notes',
            constraints: { nullable: true, maxLength: 500 },
          },
        ],
      },
    ],
  };
}

describe('resolveFieldCanonicalKey', () => {
  test('prefers canonicalKey, falls back to key', () => {
    expect(resolveFieldCanonicalKey({ key: 'a', canonicalKey: 'x.y' })).toBe('x.y');
    expect(resolveFieldCanonicalKey({ key: 'a', canonicalKey: '  ' })).toBe('a');
    expect(resolveFieldCanonicalKey({ key: 'a' })).toBe('a');
  });
});

describe('compileToJsonSchema', () => {
  test('produces a known-answer draft-07 schema keyed by canonicalKey', () => {
    const compiled = compileToJsonSchema(buildDefinition());

    expect(compiled).toEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        'cope.construction': { type: 'string', enum: ['frame', 'masonry'] },
        'financials.tiv': { type: 'number', minimum: 0, maximum: 1_000_000_000, unit: 'USD' },
        'insured.name': { type: 'string' },
        notes: { type: ['string', 'null'], maxLength: 500 },
      },
      // 'notes' is required:true but nullable ⇒ excluded from required[]; sorted.
      required: ['financials.tiv', 'insured.name'],
      additionalProperties: true,
    });
  });

  test('is deterministic regardless of field/section ordering', () => {
    const def = buildDefinition();
    const reversed: PageTemplateDefinition = {
      ...def,
      sections: def.sections.map((section) => ({ ...section, fields: [...section.fields].reverse() })),
    };
    expect(compileToJsonSchema(reversed)).toEqual(compileToJsonSchema(def));
  });

  test('handles empty / malformed definitions without throwing', () => {
    const compiled = compileToJsonSchema({ schemaVersion: 1, pageKey: 'p', title: 't', sections: [] });
    expect(compiled.properties).toEqual({});
    expect(compiled.required).toEqual([]);
  });

  test('compiles a repeatable section to an array under its collectionKey', () => {
    const def: PageTemplateDefinition = {
      schemaVersion: 1,
      pageKey: 'insured-subjects',
      title: 'Schedule',
      sections: [
        {
          key: 'subject-identity',
          label: 'Identity',
          order: 10,
          fields: [{ key: 'subjectLabel', label: 'Subject', type: 'text', order: 10, required: true, canonicalKey: 'subjectLabel' }],
        },
        {
          key: 'statement-of-values',
          label: 'Statement of Values',
          order: 60,
          repeatable: true,
          collectionKey: 'statementOfValues',
          minItems: 1,
          maxItems: 50,
          itemLabel: 'Value Item',
          fields: [
            { key: 'sovItemDescription', label: 'Item', type: 'text', order: 10, required: true },
            { key: 'sovInsuredValue', label: 'Value', type: 'number', order: 20, required: true, constraints: { min: 0, unit: 'USD' } },
            { key: 'sovNotes', label: 'Notes', type: 'textarea', order: 30 },
          ],
        },
      ],
    };

    const compiled = compileToJsonSchema(def);

    // Flat field hoisted as before.
    expect(compiled.properties.subjectLabel).toEqual({ type: 'string' });
    // Repeatable section becomes an array keyed by collectionKey, NOT flat fields.
    expect(compiled.properties.sovItemDescription).toBeUndefined();
    expect(compiled.properties.statementOfValues).toEqual({
      type: 'array',
      minItems: 1,
      maxItems: 50,
      items: {
        type: 'object',
        additionalProperties: true,
        properties: {
          sovItemDescription: { type: 'string' },
          sovInsuredValue: { type: 'number', minimum: 0, unit: 'USD' },
          sovNotes: { type: 'string' },
        },
        required: ['sovInsuredValue', 'sovItemDescription'],
      },
    });
    // The array itself stays additive — only the flat required field is top-level required.
    expect(compiled.required).toEqual(['subjectLabel']);
  });

  test('falls back to a camelCase collectionKey when none is given', () => {
    const compiled = compileToJsonSchema({
      schemaVersion: 1,
      pageKey: 'p',
      title: 't',
      sections: [
        {
          key: 'coverage-layers',
          label: 'Coverage Layers',
          order: 10,
          repeatable: true,
          fields: [{ key: 'limit', label: 'Limit', type: 'number', order: 10, required: true }],
        },
      ],
    });
    expect(Object.keys(compiled.properties)).toEqual(['coverageLayers']);
    expect((compiled.properties.coverageLayers as { type: string }).type).toBe('array');
  });

  test('validates rows inside a repeatable array (minItems + item required + bounds)', () => {
    const compiled = compileToJsonSchema({
      schemaVersion: 1,
      pageKey: 'p',
      title: 't',
      sections: [
        {
          key: 'statement-of-values',
          label: 'SOV',
          order: 10,
          repeatable: true,
          collectionKey: 'statementOfValues',
          minItems: 1,
          fields: [
            { key: 'sovItemDescription', label: 'Item', type: 'text', order: 10, required: true },
            { key: 'sovInsuredValue', label: 'Value', type: 'number', order: 20, required: true, constraints: { min: 0 } },
          ],
        },
      ],
    });

    // Absent array is tolerated (additive — legacy/flat data still passes).
    expect(validateCanonicalData({}, compiled).ok).toBe(true);
    // Present-but-empty violates minItems.
    expect(validateCanonicalData({ statementOfValues: [] }, compiled).ok).toBe(false);
    // A row missing a required field fails.
    expect(validateCanonicalData({ statementOfValues: [{ sovInsuredValue: 100 }] }, compiled).ok).toBe(false);
    // A negative value fails the item-level bound.
    expect(validateCanonicalData({ statementOfValues: [{ sovItemDescription: 'Building', sovInsuredValue: -1 }] }, compiled).ok).toBe(false);
    // A well-formed schedule passes.
    expect(
      validateCanonicalData(
        { statementOfValues: [{ sovItemDescription: 'Building', sovInsuredValue: 100 }, { sovItemDescription: 'Contents', sovInsuredValue: 50 }] },
        compiled,
      ).ok,
    ).toBe(true);
  });
});

describe('validateCanonicalData', () => {
  const compiled = compileToJsonSchema(buildDefinition());

  test('passes valid data', () => {
    const result = validateCanonicalData(
      { 'insured.name': 'Acme', 'financials.tiv': 5_000_000, 'cope.construction': 'frame' },
      compiled,
    );
    expect(result).toEqual({ ok: true });
  });

  test('fails when a required field is missing', () => {
    const result = validateCanonicalData({ 'insured.name': 'Acme' }, compiled);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.keyword === 'required' && e.path.includes('financials.tiv'))).toBe(true);
    }
  });

  test('fails on type and bound violations', () => {
    const tooBig = validateCanonicalData(
      { 'insured.name': 'Acme', 'financials.tiv': 2_000_000_000 },
      compiled,
    );
    expect(tooBig.ok).toBe(false);

    const wrongType = validateCanonicalData(
      { 'insured.name': 'Acme', 'financials.tiv': 'not-a-number' },
      compiled,
    );
    expect(wrongType.ok).toBe(false);
  });

  test('fails on enum violation', () => {
    const result = validateCanonicalData(
      { 'insured.name': 'Acme', 'financials.tiv': 1, 'cope.construction': 'steel' },
      compiled,
    );
    expect(result.ok).toBe(false);
  });

  test('allows additional properties (append-only union spirit)', () => {
    const result = validateCanonicalData(
      { 'insured.name': 'Acme', 'financials.tiv': 1, 'some.base.field': 'ok' },
      compiled,
    );
    expect(result).toEqual({ ok: true });
  });
});

describe('computeContentHash', () => {
  test('is stable across calls (idempotent)', () => {
    const def = buildDefinition();
    expect(computeContentHash(def)).toBe(computeContentHash(def));
  });

  test('is independent of object key ordering', () => {
    const a = { b: 1, a: 2, nested: { y: 1, x: 2 } };
    const b = { a: 2, b: 1, nested: { x: 2, y: 1 } };
    expect(computeContentHash(a)).toBe(computeContentHash(b));
  });

  test('changes when content changes', () => {
    const def = buildDefinition();
    const edited = JSON.parse(JSON.stringify(def)) as PageTemplateDefinition;
    edited.sections[0].fields.push({ key: 'extra', label: 'Extra', type: 'text', order: 99 });
    expect(computeContentHash(edited)).not.toBe(computeContentHash(def));
  });

  test('produces a 64-char hex sha256 digest', () => {
    expect(computeContentHash({ a: 1 })).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('decidePublish (idempotency logic)', () => {
  const def = buildDefinition();
  const hash = computeContentHash(def);

  test('creates v1 when no versions exist', () => {
    expect(decidePublish(def, [])).toEqual({ action: 'create', schemaVersion: 1, contentHash: hash });
  });

  test('reuses an existing version with identical content (no-op republish)', () => {
    const decision = decidePublish(def, [{ id: 7, schemaVersion: 3, contentHash: hash }]);
    expect(decision).toEqual({ action: 'reuse', reuseId: 7, schemaVersion: 3, contentHash: hash });
  });

  test('creates next version when content differs', () => {
    const decision = decidePublish(def, [
      { id: 1, schemaVersion: 1, contentHash: 'aaa' },
      { id: 2, schemaVersion: 2, contentHash: 'bbb' },
    ]);
    expect(decision).toEqual({ action: 'create', schemaVersion: 3, contentHash: hash });
  });
});
