// Mock DB models so workflow persistence runs without a database.
jest.mock('../../db/models', () => ({
  TriageResult: { create: jest.fn() },
  WorkflowState: { findOrCreate: jest.fn() },
}));

import { TriageResult, WorkflowState } from '../../db/models';
import { WorkflowService } from './service';
import { WorkflowAgent } from './GeminiWorkflowProvider';

const triageCreate = TriageResult.create as unknown as jest.Mock;
const findOrCreate = WorkflowState.findOrCreate as unknown as jest.Mock;

beforeEach(() => {
  triageCreate.mockReset().mockResolvedValue({});
  findOrCreate.mockReset().mockResolvedValue([{ status: null, tasks: null, save: jest.fn() }]);
});

const SIGNALS = {
  submission: { id: 1, tenantId: 1 },
  validation: { flaggedForMoreInfo: true, reasons: ['needs SOV'] },
  preRating: { grade: 'C', numericScore: 55 },
  oracleAttestation: { smartContractReady: true },
  capacityMatch: { route: 'standard_queue' },
};

describe('WorkflowService agent policy (no live request)', () => {
  it('uses the agent decision when available', async () => {
    const decide = jest.fn().mockResolvedValue({
      decision: 'PRIORITY_ROUTE',
      suggestedSubmissionStatus: 'modeling',
      reasons: ['fast track'],
    });
    const agent: WorkflowAgent = { isAvailable: () => true, decide };

    const res: any = await new WorkflowService({ workflowAgent: agent }).process(SIGNALS);

    expect(res.ok).toBe(true);
    expect(res.decision).toBe('PRIORITY_ROUTE'); // agent overrode the heuristic (MORE_INFO)
    expect(res.reasons).toEqual(['fast track']);
    expect(decide).toHaveBeenCalledTimes(1);
  });

  it('falls back to the rule chain when the agent throws', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const decide = jest.fn().mockRejectedValue(new Error('quota'));
    const agent: WorkflowAgent = { isAvailable: () => true, decide };

    const res: any = await new WorkflowService({ workflowAgent: agent }).process(SIGNALS);

    expect(res.decision).toBe('MORE_INFO'); // heuristic: flaggedForMoreInfo
    expect(res.suggestedSubmissionStatus).toBe('submitted');
    warn.mockRestore();
  });

  it('uses the rule chain (no agent call) when unavailable', async () => {
    const decide = jest.fn();
    const agent: WorkflowAgent = { isAvailable: () => false, decide };

    const res: any = await new WorkflowService({ workflowAgent: agent }).process(SIGNALS);

    expect(res.decision).toBe('MORE_INFO');
    expect(decide).not.toHaveBeenCalled();
  });
});
