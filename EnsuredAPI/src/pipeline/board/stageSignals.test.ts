import { extractStageSignals } from './stageSignals';

describe('extractStageSignals', () => {
  it('projects templatePersisted from a schemaGeneration result', () => {
    const result = {
      ok: true,
      service: 'schemaGeneration',
      source: 'gemini_schema',
      sectionCount: 8,
      persisted: true,
      templatePersisted: true,
    };
    expect(extractStageSignals(result)).toEqual({ templatePersisted: true });
  });

  it('captures templatePersisted=false (write-back skipped)', () => {
    expect(extractStageSignals({ ok: true, templatePersisted: false })).toEqual({ templatePersisted: false });
  });

  it('returns an empty bag when no known signal is present', () => {
    expect(extractStageSignals({ ok: true, service: 'extraction', structuredData: {} })).toEqual({});
  });

  it('never copies large/unknown fields into the bag', () => {
    const result = { ok: true, schema: { sections: new Array(100).fill({}) }, templatePersisted: true };
    expect(extractStageSignals(result)).toEqual({ templatePersisted: true });
  });

  it('tolerates non-object inputs', () => {
    expect(extractStageSignals(null)).toEqual({});
    expect(extractStageSignals(undefined)).toEqual({});
    expect(extractStageSignals('nope')).toEqual({});
  });
});
