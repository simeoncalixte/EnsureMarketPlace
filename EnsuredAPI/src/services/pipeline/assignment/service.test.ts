import Fastify from 'fastify';
import { createPipelineTransformationReporter } from '../../../../test/helpers/pipelineTransformations';
import { assignmentRoute } from '../../../routes/pipeline/assignment';
import { AssignmentService, RosterLoader } from './service';
import {
  AssignmentCandidate,
  chooseAssigneeByLoad,
  fullName,
  targetRoleForSubmissionType,
} from './roleRouting';
import type { AssignmentAgent, AssignmentAgentInput } from './GeminiAssignmentProvider';

function candidate(over: Partial<AssignmentCandidate> & { userId: number }): AssignmentCandidate {
  return {
    firstName: 'Test',
    lastName: `User${over.userId}`,
    role: 'analyst',
    departmentId: 10,
    departmentName: 'Underwriting',
    teamId: 20,
    teamName: 'Property',
    openAssignments: 0,
    ...over,
  };
}

/** A roster loader that returns a fixed list regardless of org (test seam). */
function rosterOf(...candidates: AssignmentCandidate[]): RosterLoader {
  return async () => candidates;
}

/** An agent that is "available" and always picks the given userId. */
function agentPicking(userId: number, confidence = 0.9): AssignmentAgent {
  return {
    isAvailable: () => true,
    choose: async () => ({ assignedUserId: userId, confidence, reason: 'agent pick' }),
  };
}

const unavailableAgent: AssignmentAgent = {
  isAvailable: () => false,
  choose: async () => {
    throw new Error('should not be called');
  },
};

describe('Assignment pipeline routes', () => {
  let app: any;
  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(assignmentRoute, { prefix: '/api' });
    await app.ready();
  });
  afterAll(async () => {
    if (app && typeof app.close === 'function') await app.close();
  });

  test('GET /api/pipeline/assignment/health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/pipeline/assignment/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ status: 'ok', service: 'assignment' });
  });
});

describe('roleRouting (pure)', () => {
  test('maps known submission types to a target role, with a default fallback', () => {
    expect(targetRoleForSubmissionType('new_business')).toBe('analyst');
    expect(targetRoleForSubmissionType('claim')).toBe('analyst');
    // Reinsurance placements are senior-underwriter work.
    expect(targetRoleForSubmissionType('treaty_reinsurance')).toBe('insurer');
    expect(targetRoleForSubmissionType('facultative_reinsurance')).toBe('insurer');
    // Unknown / null fall back to the default owner role.
    expect(targetRoleForSubmissionType('not_a_type')).toBe('analyst');
    expect(targetRoleForSubmissionType(null)).toBe('analyst');
  });

  test('chooseAssigneeByLoad prefers the least-loaded person, tie-broken by userId', () => {
    const picked = chooseAssigneeByLoad([
      candidate({ userId: 3, openAssignments: 5 }),
      candidate({ userId: 1, openAssignments: 2 }),
      candidate({ userId: 2, openAssignments: 2 }),
    ]);
    // 1 and 2 are tied on load (2); lowest userId (1) wins.
    expect(picked?.userId).toBe(1);
  });

  test('chooseAssigneeByLoad returns null for an empty roster', () => {
    expect(chooseAssigneeByLoad([])).toBeNull();
  });

  test('fullName trims and joins', () => {
    expect(fullName({ firstName: ' Ada ', lastName: 'Lovelace' })).toBe('Ada Lovelace');
    expect(fullName({ firstName: '', lastName: null })).toBe('');
  });
});

describe('AssignmentService selection policy', () => {
  const transformations = createPipelineTransformationReporter('assignment');
  afterAll(async () => transformations.write());

  test('heuristic (no agent): assigns the least-loaded person of the target role', async () => {
    const svc = new AssignmentService({
      assignmentAgent: unavailableAgent,
      rosterLoader: rosterOf(
        candidate({ userId: 1, role: 'analyst', openAssignments: 4 }),
        candidate({ userId: 2, role: 'analyst', openAssignments: 1, teamName: 'Casualty' }),
        candidate({ userId: 9, role: 'insurer', openAssignments: 0 }),
      ),
    });

    const input = { organizationId: 1, submissionTypeCode: 'new_business' };
    const result: any = await svc.process(input);

    transformations.record({
      stage: 'assignment',
      testName: 'heuristic assigns least-loaded analyst',
      description: 'A submission is given a department, team and person based on the role that owns its type.',
      before: input,
      after: result,
    });

    expect(result.ok).toBe(true);
    expect(result.targetRole).toBe('analyst');
    expect(result.method).toBe('heuristic');
    expect(result.assignedUserId).toBe(2); // least-loaded analyst; the insurer is not eligible
    expect(result.assignedDepartmentId).toBe(10);
    expect(result.assignedTeamId).toBe(20);
    expect(result.needsReview).toBe(false);
  });

  test('reinsurance routes to the insurer role', async () => {
    const svc = new AssignmentService({
      assignmentAgent: unavailableAgent,
      rosterLoader: rosterOf(
        candidate({ userId: 1, role: 'analyst', openAssignments: 0 }),
        candidate({ userId: 7, role: 'insurer', openAssignments: 3 }),
      ),
    });
    const result: any = await svc.process({ organizationId: 1, submissionTypeCode: 'treaty_reinsurance' });
    expect(result.targetRole).toBe('insurer');
    expect(result.assignedUserId).toBe(7);
  });

  test('agent-primary: uses the agent pick when available', async () => {
    const svc = new AssignmentService({
      assignmentAgent: agentPicking(3, 0.95),
      rosterLoader: rosterOf(
        candidate({ userId: 2, role: 'analyst', openAssignments: 0 }),
        candidate({ userId: 3, role: 'analyst', openAssignments: 8 }),
      ),
    });
    const result: any = await svc.process({ organizationId: 1, submissionTypeCode: 'new_business' });
    expect(result.method).toBe('agent');
    expect(result.assignedUserId).toBe(3); // agent's pick, even though it is more loaded
    expect(result.confidence).toBeCloseTo(0.95);
  });

  test('falls back to the heuristic and warns when the agent picks an off-list user', async () => {
    const svc = new AssignmentService({
      assignmentAgent: agentPicking(999), // not in the roster
      rosterLoader: rosterOf(
        candidate({ userId: 1, role: 'analyst', openAssignments: 5 }),
        candidate({ userId: 2, role: 'analyst', openAssignments: 1 }),
      ),
    });
    const result: any = await svc.process({ organizationId: 1, submissionTypeCode: 'new_business' });
    expect(result.method).toBe('heuristic');
    expect(result.assignedUserId).toBe(2);
    expect(result.warnings[0]).toMatch(/agent failed/i);
  });

  test('leaves the submission unassigned (needsReview) when no one holds the role', async () => {
    const svc = new AssignmentService({
      assignmentAgent: unavailableAgent,
      rosterLoader: rosterOf(candidate({ userId: 1, role: 'investor', openAssignments: 0 })),
    });
    const result: any = await svc.process({ organizationId: 1, submissionTypeCode: 'new_business' });
    expect(result.method).toBe('unassigned');
    expect(result.assignedUserId).toBeNull();
    expect(result.needsReview).toBe(true);
    expect(result.warnings[0]).toMatch(/no active "analyst" user/i);
  });

  test('flags needsReview when the assignee has no department/team placement', async () => {
    const svc = new AssignmentService({
      assignmentAgent: unavailableAgent,
      rosterLoader: rosterOf(
        candidate({ userId: 1, role: 'analyst', departmentId: null, departmentName: null, teamId: null, teamName: null }),
      ),
    });
    const result: any = await svc.process({ organizationId: 1, submissionTypeCode: 'new_business' });
    expect(result.assignedUserId).toBe(1);
    expect(result.assignedDepartmentId).toBeNull();
    expect(result.needsReview).toBe(true);
  });
});
