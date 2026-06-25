import { TriageResult, WorkflowState } from '../../db/models';
import { ValidationDecision } from '../validation/types';
import { runStage } from '../stageResult';
import {
  GeminiWorkflowAgent,
  WORKFLOW_PROMPT_VERSION,
  WorkflowAgent,
  WorkflowDecision,
  WorkflowInput,
} from './GeminiWorkflowProvider';

/** Who made the triage call — persisted so the decision is auditable. */
export type WorkflowDecisionSource = 'gemini_workflow' | 'heuristic_rules';

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
   * chain passed in as `heuristic`. Returns WHO decided (and a warning when the
   * agent failed) so the decision is attributable in the persisted result.
   */
  private async decideWithPolicy(
    input: WorkflowInput,
    heuristic: WorkflowDecision,
  ): Promise<{ chosen: WorkflowDecision; source: WorkflowDecisionSource; warning: string | null }> {
    if (this.agent.isAvailable()) {
      try {
        return { chosen: await this.agent.decide(input), source: 'gemini_workflow', warning: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // eslint-disable-next-line no-console
        console.warn('workflow: agent failed, using rule chain:', message);
        return {
          chosen: heuristic,
          source: 'heuristic_rules',
          warning: `workflow agent failed; rule chain used: ${message}`,
        };
      }
    }
    return { chosen: heuristic, source: 'heuristic_rules', warning: null };
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
    const { chosen, source, warning } = await this.decideWithPolicy(input, {
      decision: heuristicDecision,
      suggestedSubmissionStatus: heuristicStatus,
      reasons: heuristicReasons,
    });
    const decision = chosen.decision;
    const suggestedSubmissionStatus = chosen.suggestedSubmissionStatus;
    const reasons = chosen.reasons;

    if (submission?.id) {
      const submissionId = Number(submission.id);
      const organizationId = submission.organizationId ?? null;

      await TriageResult.create({
        submissionId,
        organizationId,
        decision,
        score: Number.isFinite(score) ? score / 100 : null,
        reasons: {
          validation,
          preRating,
          oracleAttestation,
          capacityMatch,
          reasons,
          // Decision provenance: who decided, under which prompt revision.
          decisionSource: source,
          ...(source === 'gemini_workflow' ? { promptVersion: WORKFLOW_PROMPT_VERSION } : {}),
        },
        decidedAt: new Date(),
      });

      const [workflowState] = await WorkflowState.findOrCreate({
        where: { submissionId },
        defaults: {
          submissionId,
          organizationId,
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
      // Provenance: `provider` is what the board copies onto StageExecution, so
      // playback can answer "who made this triage call".
      source,
      provider: source,
      warnings: warning ? [warning] : [],
    };
  }
}
