import { TriageResult, WorkflowState } from '../../db/models';
import { ValidationDecision } from '../validation/types';
import { runStage } from '../stageResult';
import { GeminiWorkflowAgent, WorkflowAgent, WorkflowDecision, WorkflowInput } from './GeminiWorkflowProvider';

function toRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, any>;
}

export class WorkflowService {
  private readonly agent: WorkflowAgent;

  /** The Gemini decision agent is injectable for testing; dormant without a key. */
  constructor(deps: { workflowAgent?: WorkflowAgent } = {}) {
    this.agent = deps.workflowAgent ?? new GeminiWorkflowAgent();
  }

  async process(payload: any): Promise<Record<string, unknown>> {
    return runStage('workflow', () => this.runWorkflow(payload));
  }

  /**
   * Pick the triage decision with the Gemini agent when configured, otherwise —
   * or if the call returns an invalid/failed result — use the deterministic rule
   * chain passed in as `heuristic`.
   */
  private async decideWithPolicy(input: WorkflowInput, heuristic: WorkflowDecision): Promise<WorkflowDecision> {
    if (this.agent.isAvailable()) {
      try {
        return await this.agent.decide(input);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('workflow: agent failed, using rule chain:', err instanceof Error ? err.message : err);
      }
    }
    return heuristic;
  }

  private async runWorkflow(payload: any): Promise<Record<string, unknown>> {
    const submission = payload?.submission;
    const validation = toRecord(payload?.validation);
    const preRating = toRecord(payload?.preRating);
    const oracleAttestation = toRecord(payload?.oracleAttestation);
    const capacityMatch = toRecord(payload?.capacityMatch);

    const flaggedForMoreInfo = Boolean(validation.flaggedForMoreInfo);
    const outOfAppetite = validation.decision === ValidationDecision.OUT_OF_APPETITE
      || toRecord(validation.appetite).decision === ValidationDecision.OUT_OF_APPETITE;
    const smartContractReady = Boolean(oracleAttestation.smartContractReady);
    const matchedQueue = String(capacityMatch.route ?? 'standard_queue');
    const grade = String(preRating.grade ?? 'D');
    const score = Number(preRating.numericScore ?? 0);

    let heuristicDecision = 'REVIEW';
    let heuristicStatus = 'modeling';
    if (outOfAppetite) {
      heuristicDecision = ValidationDecision.OUT_OF_APPETITE;
      heuristicStatus = 'rejected';
    } else if (flaggedForMoreInfo) {
      heuristicDecision = 'MORE_INFO';
      heuristicStatus = 'submitted';
    } else if (!smartContractReady) {
      heuristicDecision = 'ORACLE_INCOMPATIBLE';
      heuristicStatus = 'submitted';
    } else if (matchedQueue === 'partner_pool') {
      heuristicDecision = 'ROUTE_PARTNER_POOL';
    } else if (grade === 'A' || grade === 'B') {
      heuristicDecision = 'PRIORITY_ROUTE';
    }

    const heuristicReasons: string[] = [
      ...(Array.isArray(validation.reasons) ? validation.reasons.map((r: unknown) => String(r)) : []),
      ...(!smartContractReady ? [String(oracleAttestation.reason ?? 'Oracle attestation unavailable')] : []),
      ...(matchedQueue === 'partner_pool' ? ['Outside current open-capacity appetite'] : []),
    ];

    // LLM-primary triage decision, with the rule chain above as the fallback.
    const input: WorkflowInput = { validation, preRating, oracleAttestation, capacityMatch };
    const chosen = await this.decideWithPolicy(input, {
      decision: heuristicDecision,
      suggestedSubmissionStatus: heuristicStatus,
      reasons: heuristicReasons,
    });
    const decision = chosen.decision;
    const suggestedSubmissionStatus = chosen.suggestedSubmissionStatus;
    const reasons = chosen.reasons;

    if (submission?.id) {
      const submissionId = Number(submission.id);
      const tenantId = submission.tenantId ?? null;

      await TriageResult.create({
        submissionId,
        tenantId,
        decision,
        score: Number.isFinite(score) ? score / 100 : null,
        reasons: {
          validation,
          preRating,
          oracleAttestation,
          capacityMatch,
          reasons,
        },
        decidedAt: new Date(),
      });

      const [workflowState] = await WorkflowState.findOrCreate({
        where: { submissionId },
        defaults: {
          submissionId,
          tenantId,
          status: suggestedSubmissionStatus,
          assignedTo: null,
          tasks: null,
        },
      });

      workflowState.status = suggestedSubmissionStatus;
      workflowState.tasks = {
        decision,
        queue: matchedQueue,
        grade,
        priorityRank: preRating.priorityRank ?? null,
        smartContractReady,
      };
      await workflowState.save();
    }

    return {
      ok: true,
      service: 'workflow',
      decision,
      queue: matchedQueue,
      grade,
      score,
      reasons,
      suggestedSubmissionStatus,
    };
  }
}
