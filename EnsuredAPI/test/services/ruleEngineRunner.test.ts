// Unit test for the live rule runner with a mocked model layer (no DB), so the
// action dispatch — condition gate, dry-run vs live, calculate/set/create/update
// /delete and org-scoping — is verified deterministically.
jest.mock('../../src/services/modelFieldCatalog', () => ({
  resolveOrgScopedModel: jest.fn(),
}));

import { resolveOrgScopedModel } from '../../src/services/modelFieldCatalog';
import { RuleEngineRunner } from '../../src/services/ruleEngineRunner';
import type { RuleAction } from '../../src/services/pipeline/validation/ruleEngine';

const resolveModel = resolveOrgScopedModel as unknown as jest.Mock;

/** A fake Sequelize record with get/update/destroy spies. */
function fakeRecord(data: Record<string, unknown>) {
  const row: any = {
    ...data,
    get: (arg?: any) => (arg && typeof arg === 'object' ? { ...data } : (data as any)[arg]),
    update: jest.fn(async (patch: Record<string, unknown>) => Object.assign(data, patch)),
    destroy: jest.fn(async () => undefined),
  };
  return row;
}

function ruleSet(subjectModel: string, rootCondition: any, actions: RuleAction[]): any {
  return { id: 1, subjectModel, rootCondition, actions };
}

const ORG = 7;

beforeEach(() => resolveModel.mockReset());

describe('RuleEngineRunner', () => {
  it('skips actions when conditions do not match', async () => {
    const subject = fakeRecord({ id: 5, status: 'new' });
    const model = { findOne: jest.fn().mockResolvedValue(subject) };
    resolveModel.mockReturnValue(model);

    const rule = ruleSet('submission', { connector: 'AND', conditions: [{ field: 'submission.status', operator: 'equals', value: 'bound' }] }, [
      { type: 'modify', assignments: [{ path: 'submission.status', source: { mode: 'literal', value: 'triaged' } }] },
    ]);
    const res = await new RuleEngineRunner().run(ORG, rule, 5, { dryRun: false });

    expect(res.matched).toBe(false);
    expect(subject.update).not.toHaveBeenCalled();
  });

  it('modifies the subject (with a formula value) only on a live run', async () => {
    const subject = fakeRecord({ id: 5, status: 'new', limit: 2_000_000, score: 0 });
    resolveModel.mockReturnValue({ findOne: jest.fn().mockResolvedValue(subject) });

    const rule = ruleSet('submission', { connector: 'AND', conditions: [] }, [
      {
        type: 'modify',
        assignments: [
          { path: 'submission.score', source: { mode: 'expression', expression: 'submission.limit * 0.1' } },
          { path: 'submission.status', source: { mode: 'literal', value: 'triaged' } },
        ],
      },
    ]);
    const runner = new RuleEngineRunner();

    const dry = await runner.run(ORG, rule, 5, { dryRun: true });
    expect(dry.actions[0].status).toBe('previewed');
    expect(dry.actions[0].after).toEqual({ score: 200_000, status: 'triaged' });
    expect(subject.update).not.toHaveBeenCalled();

    const live = await runner.run(ORG, rule, 5, { dryRun: false });
    expect(live.actions[0].status).toBe('applied');
    expect(subject.update).toHaveBeenCalledWith({ score: 200_000, status: 'triaged' });
  });

  it('skips a modify with no field values', async () => {
    const subject = fakeRecord({ id: 5 });
    resolveModel.mockReturnValue({ findOne: jest.fn().mockResolvedValue(subject) });
    const rule = ruleSet('submission', { conditions: [] }, [{ type: 'modify', assignments: [] }]);
    const res = await new RuleEngineRunner().run(ORG, rule, 5, { dryRun: false });
    expect(res.actions[0].status).toBe('skipped');
    expect(subject.update).not.toHaveBeenCalled();
  });

  it('creates a related record org-scoped, resolving an expression assignment', async () => {
    const subject = fakeRecord({ id: 5, limit: 10 });
    const created = fakeRecord({ id: 99 });
    const target = { create: jest.fn().mockResolvedValue(created) };
    resolveModel.mockImplementation((key: string) => (key === 'submission' ? { findOne: jest.fn().mockResolvedValue(subject) } : target));

    const rule = ruleSet('submission', { conditions: [] }, [
      {
        type: 'create',
        targetModel: 'triageResult',
        assignments: [
          { path: 'score', source: { mode: 'expression', expression: 'submission.limit + 5' } },
          { path: 'decision', source: { mode: 'literal', value: 'auto' } },
        ],
      },
    ]);

    const live = await new RuleEngineRunner().run(ORG, rule, 5, { dryRun: false });
    expect(live.actions[0].status).toBe('applied');
    expect(target.create).toHaveBeenCalledWith({ score: 15, decision: 'auto', organizationId: ORG });
  });

  it('refuses an update with no match selector, but updates matching rows otherwise', async () => {
    const subject = fakeRecord({ id: 5 });
    const rowA = fakeRecord({ id: 1, status: 'open' });
    const rowB = fakeRecord({ id: 2, status: 'closed' });
    const target = { findAll: jest.fn().mockResolvedValue([rowA, rowB]) };
    resolveModel.mockImplementation((key: string) => (key === 'submission' ? { findOne: jest.fn().mockResolvedValue(subject) } : target));

    const noMatch = ruleSet('submission', { conditions: [] }, [
      { type: 'update', targetModel: 'workflowState', assignments: [{ path: 'status', source: { mode: 'literal', value: 'x' } }], match: { connector: 'AND', conditions: [] } },
    ]);
    const res1 = await new RuleEngineRunner().run(ORG, noMatch, 5, { dryRun: false });
    expect(res1.actions[0].status).toBe('skipped');

    const withMatch = ruleSet('submission', { conditions: [] }, [
      {
        type: 'update',
        targetModel: 'workflowState',
        assignments: [{ path: 'status', source: { mode: 'literal', value: 'done' } }],
        match: { connector: 'AND', conditions: [{ field: 'workflowState.status', operator: 'equals', value: 'open' }] },
      },
    ]);
    const res2 = await new RuleEngineRunner().run(ORG, withMatch, 5, { dryRun: false });
    expect(res2.actions[0].affected).toBe(1);
    expect(rowA.update).toHaveBeenCalledWith({ status: 'done' });
    expect(rowB.update).not.toHaveBeenCalled();
  });

  it('reports a missing subject without running actions', async () => {
    resolveModel.mockReturnValue({ findOne: jest.fn().mockResolvedValue(null) });
    const rule = ruleSet('submission', { conditions: [] }, [{ type: 'modify', assignments: [{ path: 'submission.status', source: { mode: 'literal', value: 'x' } }] }]);
    const res = await new RuleEngineRunner().run(ORG, rule, 404, { dryRun: true });
    expect(res.subjectFound).toBe(false);
    expect(res.matched).toBe(false);
  });
});
