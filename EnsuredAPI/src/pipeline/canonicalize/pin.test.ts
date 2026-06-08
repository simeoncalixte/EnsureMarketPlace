import { compileToJsonSchema } from '../schema/compile';
import type { PageTemplateDefinition } from '../../db/models/pageTemplates.models';
import { decideEnforcement, derivePin } from './pin';

const published = (id: number, schemaVersion: number, status = 'published') => ({ id, schemaVersion, status });

describe('derivePin (Slice 3, pure, DB-free)', () => {
  it('(d) REPLAY: reuses an existing pin verbatim and does not re-resolve', () => {
    const decision = derivePin({
      existingPinId: 42,
      primaryCode: 'property',
      registryActiveSchemaVersionId: 7, // would be preferred on a fresh pin — ignored on replay
      candidatePublishedVersions: [published(7, 3), published(99, 9)],
    });
    expect(decision).toEqual({ pinId: 42, reason: 'reuse_existing_pin' });
  });

  it('(a/e) no derived LOB ⇒ no pin (no-op path)', () => {
    expect(
      derivePin({ existingPinId: null, primaryCode: null, registryActiveSchemaVersionId: null, candidatePublishedVersions: [published(1, 1)] }),
    ).toEqual({ pinId: null, reason: 'no_lob' });
  });

  it('(a) LOB present but no published version ⇒ no pin (no-op path)', () => {
    expect(
      derivePin({ existingPinId: null, primaryCode: 'property', registryActiveSchemaVersionId: null, candidatePublishedVersions: [] }),
    ).toEqual({ pinId: null, reason: 'no_published_version' });
  });

  it('prefers the registry active version when it is a published candidate', () => {
    const decision = derivePin({
      existingPinId: null,
      primaryCode: 'property',
      registryActiveSchemaVersionId: 5,
      candidatePublishedVersions: [published(5, 2), published(8, 4)],
    });
    expect(decision).toEqual({ pinId: 5, reason: 'registry_active' });
  });

  it('ignores a registry active id that is NOT among published candidates → latest published', () => {
    const decision = derivePin({
      existingPinId: null,
      primaryCode: 'property',
      registryActiveSchemaVersionId: 999, // stale / archived pointer
      candidatePublishedVersions: [published(5, 2), published(8, 4)],
    });
    expect(decision).toEqual({ pinId: 8, reason: 'latest_published' });
  });

  it('falls back to the latest published version when registry declares none', () => {
    const decision = derivePin({
      existingPinId: null,
      primaryCode: 'property',
      registryActiveSchemaVersionId: null,
      candidatePublishedVersions: [published(5, 2), published(8, 4), published(3, 1)],
    });
    expect(decision).toEqual({ pinId: 8, reason: 'latest_published' });
  });

  it('ignores non-published (archived) candidates', () => {
    const decision = derivePin({
      existingPinId: null,
      primaryCode: 'property',
      registryActiveSchemaVersionId: null,
      candidatePublishedVersions: [published(8, 4, 'archived'), published(5, 2, 'published')],
    });
    expect(decision).toEqual({ pinId: 5, reason: 'latest_published' });
  });
});

describe('decideEnforcement (Slice 3, pure, DB-free)', () => {
  const def: PageTemplateDefinition = {
    schemaVersion: 1,
    pageKey: 'create-coverage',
    title: 'Coverage',
    sections: [
      {
        key: 'financials',
        label: 'Financials',
        order: 1,
        fields: [
          { key: 'limit', label: 'Limit', type: 'number', order: 1, required: true, canonicalKey: 'limit', constraints: { min: 0 } },
          { key: 'lob', label: 'LOB', type: 'text', order: 2, required: true, canonicalKey: 'lineOfBusiness' },
        ],
      },
    ],
  } as unknown as PageTemplateDefinition;

  const compiled = compileToJsonSchema(def) as unknown as Record<string, unknown>;

  it('(no_pin) skips entirely when pinId is null', () => {
    expect(decideEnforcement(null, { anything: true }, compiled)).toEqual({ enforced: false, reason: 'no_pin' });
  });

  it('(no_compiled_schema) skips when no compiled schema is available', () => {
    expect(decideEnforcement(1, { limit: 10 }, null)).toEqual({ enforced: false, reason: 'no_compiled_schema' });
  });

  it('(b) pinned + valid data ⇒ enforced & ok', () => {
    const res = decideEnforcement(1, { limit: 1000, lineOfBusiness: 'property' }, compiled);
    expect(res).toEqual({ enforced: true, ok: true });
  });

  it('(c) pinned + invalid data ⇒ enforced & not ok with errors', () => {
    const res = decideEnforcement(1, { limit: -5 }, compiled); // negative limit + missing required lineOfBusiness
    expect(res.enforced).toBe(true);
    if (res.enforced) {
      expect(res.ok).toBe(false);
      if (res.ok === false) {
        expect(res.errors.length).toBeGreaterThan(0);
        const keywords = res.errors.map((e) => e.keyword);
        expect(keywords).toEqual(expect.arrayContaining(['minimum', 'required']));
      }
    }
  });

  it('degrades to no_compiled_schema when the compiled schema is malformed (never throws)', () => {
    const bad = { type: 'object', properties: { x: { minimum: 'not-a-number' } } } as Record<string, unknown>;
    const res = decideEnforcement(1, { x: 1 }, bad);
    expect(res).toEqual({ enforced: false, reason: 'no_compiled_schema' });
  });
});
