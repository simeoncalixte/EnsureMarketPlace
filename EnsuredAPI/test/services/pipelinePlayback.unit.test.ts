import { syntheticStageOutputs } from '../../src/services/pipeline/playback/service';

// Pure (no DB): pins the seeder's stage-output derivation used to emit believable
// historical runs.

const STAGES = ['ingestion', 'ocr', 'classification', 'extraction', 'normalization', 'validation', 'workflow'];

describe('syntheticStageOutputs', () => {
  const base = {
    lineOfBusinessCode: 'property_cat',
    summaryText: 'Reinsurance Submission Extract (ACORD-style) …',
    structuredData: { fileCount: 7, cedent: 'Gulf Coast Mutual' },
  };

  it('covers ingestion through the given stage (inclusive)', () => {
    const stages = syntheticStageOutputs({ ...base, throughStageKey: 'validation' }, STAGES);
    expect(stages.map((s) => s.stageKey)).toEqual([
      'ingestion',
      'ocr',
      'classification',
      'extraction',
      'normalization',
      'validation',
    ]);
  });

  it('covers the whole pipeline for the final stage', () => {
    const stages = syntheticStageOutputs({ ...base, throughStageKey: 'workflow' }, STAGES);
    expect(stages.map((s) => s.stageKey)).toEqual(STAGES);
  });

  it('falls back to the full pipeline for an unknown stage', () => {
    const stages = syntheticStageOutputs({ ...base, throughStageKey: 'nope' }, STAGES);
    expect(stages).toHaveLength(STAGES.length);
  });

  it('derives believable per-stage outputs from the manifest', () => {
    const stages = syntheticStageOutputs({ ...base, throughStageKey: 'workflow' }, STAGES);
    const byStage = Object.fromEntries(stages.map((s) => [s.stageKey, s.output])) as Record<string, any>;

    expect(byStage.ocr.text).toBe(base.summaryText);
    expect(byStage.ocr.provider).toBe('tesseract');
    expect(byStage.classification.lineOfBusinessCode).toBe('property_cat');
    expect(byStage.extraction.structuredData).toEqual(base.structuredData);
    expect(byStage.normalization.normalized).toEqual(base.structuredData);
    expect(byStage.validation.valid).toBe(true);
    expect(byStage.workflow.decision).toBe('approved');
    for (const s of stages) expect(s.output.ok).toBe(true);
  });
});
