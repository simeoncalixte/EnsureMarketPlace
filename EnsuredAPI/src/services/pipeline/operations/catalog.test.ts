import {
  PIPELINE_OPERATION_DEFINITIONS,
  PIPELINE_OPERATION_KEYS,
  diffMissingOperations,
  decideStalePrunable,
  OperationDefinition,
  CatalogRow,
} from './catalog';
import { PIPELINE_STAGE_DEFINITIONS } from '../stages/registry';

describe('pipeline operation catalog (registry)', () => {
  it('defines every operation with complete, unique, well-formed metadata', () => {
    const keys = PIPELINE_OPERATION_DEFINITIONS.map((d) => d.operationKey);
    // unique keys
    expect(new Set(keys).size).toBe(keys.length);
    // strictly increasing defaultOrder
    const orders = PIPELINE_OPERATION_DEFINITIONS.map((d) => d.defaultOrder);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
    // required text fields populated
    for (const d of PIPELINE_OPERATION_DEFINITIONS) {
      for (const f of ['operationKey', 'stageName', 'displayName', 'description', 'category'] as const) {
        expect(typeof d[f]).toBe('string');
        expect((d[f] as string).length).toBeGreaterThan(0);
      }
      expect(typeof d.defaultEnabled).toBe('boolean');
      expect(typeof d.canDisable).toBe('boolean');
      expect(d.configSchemaJson).toEqual(expect.any(Object));
    }
  });

  it('includes the new modules that triggered this work (riskCompute etc.)', () => {
    expect(PIPELINE_OPERATION_KEYS).toEqual(
      expect.arrayContaining([
        'ingestion',
        'validation',
        'workflow',
        'riskCompute', // Slice 5.4 — the one that was missing from the catalog
        'storageSearch',
      ]),
    );
  });

  it('derives every stage operation from the central stage registry', () => {
    const operationKeys = new Set(PIPELINE_OPERATION_KEYS);
    for (const stage of PIPELINE_STAGE_DEFINITIONS) {
      expect(operationKeys).toContain(stage.key);
    }
  });

  describe('diffMissingOperations (the additive registry decision)', () => {
    it('returns ALL operations when the catalog is empty', () => {
      const missing = diffMissingOperations([]);
      expect(missing.map((d) => d.operationKey)).toEqual(PIPELINE_OPERATION_KEYS);
    });

    it('returns only operations not already registered', () => {
      const existing = ['ingestion', 'ocr', 'validation'];
      const missing = diffMissingOperations(existing).map((d) => d.operationKey);
      expect(missing).not.toEqual(expect.arrayContaining(existing));
      expect(missing).toEqual(expect.arrayContaining(['riskCompute', 'capacity']));
    });

    it('returns nothing when every operation is already present (idempotent)', () => {
      expect(diffMissingOperations(PIPELINE_OPERATION_KEYS)).toEqual([]);
    });

    it('does not propose changes to already-present rows (additive only)', () => {
      // An extra/unknown key already in the table is simply ignored (never deleted).
      const withExtra = [...PIPELINE_OPERATION_KEYS, 'some_legacy_operation'];
      expect(diffMissingOperations(withExtra)).toEqual([]);
    });

    it('only inserts the genuinely-new key when one operation is added', () => {
      const allButRiskCompute = PIPELINE_OPERATION_KEYS.filter((k) => k !== 'riskCompute');
      const missing = diffMissingOperations(allButRiskCompute).map((d: OperationDefinition) => d.operationKey);
      expect(missing).toEqual(['riskCompute']);
    });
  });

  describe('decideStalePrunable (reconcile — prune stale, never referenced)', () => {
    const rows: CatalogRow[] = [
      { id: 1, operationKey: 'validation' }, // canonical
      { id: 2, operationKey: 'auto_scrub_validation' }, // stale
      { id: 3, operationKey: 'pre_rating' }, // stale
      { id: 4, operationKey: 'workflow_routing' }, // stale, but referenced
      { id: 5, operationKey: 'riskCompute' }, // canonical
    ];

    it('prunes stale, unreferenced rows and keeps canonical rows', () => {
      const { prune, keptReferenced } = decideStalePrunable(rows, []);
      expect(prune.map((r) => r.operationKey)).toEqual(['auto_scrub_validation', 'pre_rating', 'workflow_routing']);
      expect(keptReferenced).toEqual([]);
    });

    it('NEVER prunes a stale row that is referenced by an org config', () => {
      const { prune, keptReferenced } = decideStalePrunable(rows, [4]); // id 4 referenced
      expect(prune.map((r) => r.operationKey)).toEqual(['auto_scrub_validation', 'pre_rating']);
      expect(keptReferenced.map((r) => r.operationKey)).toEqual(['workflow_routing']);
    });

    it('never prunes canonical operations even if somehow unreferenced', () => {
      const { prune } = decideStalePrunable(rows, []);
      expect(prune.map((r) => r.operationKey)).not.toEqual(expect.arrayContaining(['validation', 'riskCompute']));
    });
  });
});
