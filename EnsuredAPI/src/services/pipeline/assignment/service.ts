import { Department, EnrichmentData, Submission, SubmissionOutput, Team, User } from '../../../db/models';
import { runStage } from '../stageResult';
import { buildCanonicalView } from '../canonicalView';
import {
  AssignmentAgent,
  GeminiAssignmentAgent,
} from './GeminiAssignmentProvider';
import {
  AssignmentCandidate,
  chooseAssigneeByLoad,
  fullName,
  targetRoleForSubmissionType,
} from './roleRouting';

/**
 * The owner a submission is assigned to — a person, plus the department and team
 * that person belongs to. WHICH person is chosen is driven by ROLE: the
 * submission's transaction type maps to the staff role that should own it, and
 * the person is selected from the roster carrying that role (LLM-primary when a
 * Gemini key is configured, deterministic load-balanced heuristic otherwise).
 */
export type AssignmentResult = {
  modelVersion: string;
  /** The role the assignment was made for (the routing key). */
  targetRole: string;
  assignedUserId: number | null;
  assignedUserName: string | null;
  assignedUserRole: string | null;
  assignedDepartmentId: number | null;
  assignedDepartmentName: string | null;
  assignedTeamId: number | null;
  assignedTeamName: string | null;
  /** How the assignee was chosen. */
  method: 'agent' | 'heuristic' | 'unassigned';
  confidence: number;
  reason: string;
  /** Number of role-matched people considered. */
  candidatesConsidered: number;
  needsReview: boolean;
};

const MODEL_VERSION = 'assignment-role-routing-v1';

/** Loads the org's assignable people (with department/team + open-assignment load). */
export type RosterLoader = (organizationId: number | null) => Promise<AssignmentCandidate[]>;

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function clamp01(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * Tally current open assignments per user from the `assignment` enrichment audit
 * rows. Best-effort: a query failure (or none yet) simply yields no load so the
 * heuristic falls back to the userId tie-break. Read-only, never throws out.
 */
async function openAssignmentCounts(organizationId: number): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  try {
    const rows = await EnrichmentData.findAll({
      where: { organizationId, enrichmentType: 'assignment' },
      attributes: ['data'],
    });
    for (const row of rows) {
      const userId = Number(toRecord(row.data).assignedUserId);
      if (Number.isInteger(userId) && userId > 0) {
        counts.set(userId, (counts.get(userId) ?? 0) + 1);
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('assignment: open-assignment load query failed; assuming zero load:', err instanceof Error ? err.message : err);
  }
  return counts;
}

/** Default roster loader: active users in the org, with their dept/team + load. */
const defaultRosterLoader: RosterLoader = async (organizationId) => {
  if (!organizationId) return [];
  const [users, load] = await Promise.all([
    User.findAll({
      where: { organizationId, isActive: true },
      include: [
        { model: Department, as: 'department', required: false },
        { model: Team, as: 'team', required: false },
      ],
    }),
    openAssignmentCounts(organizationId),
  ]);

  return users.map((user) => {
    const department = (user as any).department as Department | null | undefined;
    const team = (user as any).team as Team | null | undefined;
    return {
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      departmentId: user.departmentId ?? null,
      departmentName: department?.name ?? null,
      teamId: user.teamId ?? null,
      teamName: team?.name ?? null,
      openAssignments: load.get(user.id) ?? 0,
    } satisfies AssignmentCandidate;
  });
};

function unassignedResult(targetRole: string, reason: string): AssignmentResult {
  return {
    modelVersion: MODEL_VERSION,
    targetRole,
    assignedUserId: null,
    assignedUserName: null,
    assignedUserRole: null,
    assignedDepartmentId: null,
    assignedDepartmentName: null,
    assignedTeamId: null,
    assignedTeamName: null,
    method: 'unassigned',
    confidence: 0,
    reason,
    candidatesConsidered: 0,
    needsReview: true,
  };
}

function resultFromCandidate(
  candidate: AssignmentCandidate,
  targetRole: string,
  method: 'agent' | 'heuristic',
  confidence: number,
  reason: string,
  candidatesConsidered: number,
): AssignmentResult {
  return {
    modelVersion: MODEL_VERSION,
    targetRole,
    assignedUserId: candidate.userId,
    assignedUserName: fullName(candidate) || null,
    assignedUserRole: candidate.role,
    assignedDepartmentId: candidate.departmentId,
    assignedDepartmentName: candidate.departmentName,
    assignedTeamId: candidate.teamId,
    assignedTeamName: candidate.teamName,
    method,
    confidence,
    reason,
    candidatesConsidered,
    // A person with no department/team is placed but not yet slotted into the org
    // structure — flag it so a human completes the placement.
    needsReview: confidence < 0.6 || candidate.departmentId === null || candidate.teamId === null,
  };
}

/**
 * Pipeline stage that assigns a submission to a department, team, and person
 * based on the person's ROLE. Runs after the line-of-business classifier (so the
 * submission type and LOB are both known) and before extraction, giving every
 * submission a human owner who oversees the data-heavy stages that follow.
 *
 * LLM-primary (Gemini agent when GEMINI_API_KEY is set) with a deterministic
 * load-balanced heuristic as the fallback — the same convention the other
 * judgment stages use. A fallback or an unassigned outcome surfaces as a warning.
 */
export class AssignmentService {
  private readonly agent: AssignmentAgent;
  private readonly loadRoster: RosterLoader;

  constructor(deps: { assignmentAgent?: AssignmentAgent; rosterLoader?: RosterLoader } = {}) {
    this.agent = deps.assignmentAgent ?? new GeminiAssignmentAgent();
    this.loadRoster = deps.rosterLoader ?? defaultRosterLoader;
  }

  async process(payload: any = {}): Promise<Record<string, unknown>> {
    return runStage('assignment', () => this.runAssignment(payload));
  }

  private async runAssignment(payload: any = {}): Promise<Record<string, unknown>> {
    if (payload?.submission?.id) {
      const { output, warnings } = await this.assignOne(payload.submission, payload);
      return { ok: true, service: 'assignment', ...output, warnings };
    }

    // Ad-hoc invocation (route/test) without a submission: resolve the role and
    // select from the org's roster if one was supplied, but never persist.
    const organizationId = Number(payload?.organizationId ?? 0) || null;
    const targetRole =
      readString(payload?.targetRole) ?? targetRoleForSubmissionType(payload?.submissionTypeCode);
    const roster = await this.loadRoster(organizationId);
    const { result, warning } = await this.selectAssignee({
      targetRole,
      submissionTypeCode: readString(payload?.submissionTypeCode),
      submissionTypeLabel: readString(payload?.submissionTypeLabel),
      lineOfBusinessCode: readString(payload?.lineOfBusinessCode),
      lineOfBusinessLabel: readString(payload?.lineOfBusinessLabel),
      candidates: roster.filter((c) => c.role === targetRole),
    });
    return {
      ok: true,
      service: 'assignment',
      submissionId: null,
      documentId: null,
      warning,
      ...result,
      warnings: warning ? [warning] : [],
    };
  }

  private async assignOne(
    submission: Submission | Record<string, any>,
    payload: any,
  ): Promise<{ output: Record<string, unknown>; warnings: string[] }> {
    const submissionId = Number((submission as any).id ?? 0);
    const organizationId = Number((submission as any).organizationId ?? 0) || null;

    let document =
      submissionId > 0
        ? await SubmissionOutput.findOne({ where: { submissionId }, order: [['id', 'ASC']] })
        : null;
    const structured = toRecord(document?.structuredData);
    const submissionTypeBlock = toRecord(structured.submissionType);
    const classificationBlock = toRecord(structured.classification);

    const submissionTypeCode =
      readString(structured.submissionTypeCode) ?? readString(submissionTypeBlock.submissionTypeCode);
    const submissionTypeLabel =
      readString(structured.submissionTypeLabel) ?? readString(submissionTypeBlock.submissionTypeLabel);
    const lineOfBusinessCode =
      readString(structured.lineOfBusinessCode) ?? readString(classificationBlock.lineOfBusinessCode);
    const lineOfBusinessLabel =
      readString(structured.lineOfBusiness) ?? readString(classificationBlock.lineOfBusinessLabel);

    const targetRole = readString(payload?.targetRole) ?? targetRoleForSubmissionType(submissionTypeCode);
    const roster = await this.loadRoster(organizationId);
    const candidates = roster.filter((c) => c.role === targetRole);

    const { result, warning } = await this.selectAssignee({
      targetRole,
      submissionTypeCode,
      submissionTypeLabel,
      lineOfBusinessCode,
      lineOfBusinessLabel,
      candidates,
    });

    if (submissionId > 0) {
      if (!document) {
        document = await SubmissionOutput.create({ submissionId, organizationId, structuredData: null });
      }
      const nextStructuredData = {
        ...(document.structuredData ?? {}),
        assignment: result,
      };
      // The assigned owner ids now live only in the `assignment` block and the
      // reconciled `canonical` block — not as denormalised top-level scalars. (The
      // load balancer tallies from the EnrichmentData audit row below, not here.)
      document.structuredData = {
        ...nextStructuredData,
        canonical: buildCanonicalView(nextStructuredData),
      };
      await document.save();

      // Audit row — also the source the load balancer tallies for the next run.
      // Best-effort: a failed audit must not fail the assignment itself.
      try {
        await EnrichmentData.create({
          submissionId,
          organizationId,
          enrichmentType: 'assignment',
          data: result as unknown as Record<string, unknown>,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('assignment: audit row write failed:', err instanceof Error ? err.message : err);
      }
    }

    return {
      output: { submissionId, documentId: document?.id ?? null, warning, ...result },
      warnings: warning ? [warning] : [],
    };
  }

  /**
   * Prefer the Gemini agent when a key is configured (LLM-primary convention),
   * otherwise — or if the paid call fails — fall back to the deterministic
   * load-balanced heuristic. When no person carries the target role the
   * submission is left explicitly unassigned for manual triage. Degraded or
   * unassigned outcomes are reported as a warning so they are visible on the
   * stage result, not just in server logs.
   */
  private async selectAssignee(ctx: {
    targetRole: string;
    submissionTypeCode: string | null;
    submissionTypeLabel: string | null;
    lineOfBusinessCode: string | null;
    lineOfBusinessLabel: string | null;
    candidates: AssignmentCandidate[];
  }): Promise<{ result: AssignmentResult; warning: string | null }> {
    const { targetRole, candidates } = ctx;

    if (candidates.length === 0) {
      return {
        result: unassignedResult(targetRole, `No active "${targetRole}" user in the organization.`),
        warning: `assignment: no active "${targetRole}" user available; left unassigned for manual triage`,
      };
    }

    if (this.agent.isAvailable()) {
      try {
        const choice = await this.agent.choose(ctx);
        const picked = candidates.find((c) => c.userId === choice.assignedUserId);
        if (!picked) {
          throw new Error(`agent chose user ${choice.assignedUserId} not in the candidate set`);
        }
        return {
          result: resultFromCandidate(
            picked,
            targetRole,
            'agent',
            clamp01(choice.confidence),
            choice.reason || `agent-selected ${targetRole} owner`,
            candidates.length,
          ),
          warning: null,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // eslint-disable-next-line no-console
        console.warn('assignment: agent failed, falling back to heuristic:', message);
        const picked = chooseAssigneeByLoad(candidates)!;
        return {
          result: resultFromCandidate(
            picked,
            targetRole,
            'heuristic',
            0.6,
            `Load-balanced fallback among ${candidates.length} "${targetRole}" candidate(s).`,
            candidates.length,
          ),
          warning: `assignment agent failed; load-balanced heuristic used: ${message}`,
        };
      }
    }

    const picked = chooseAssigneeByLoad(candidates)!;
    return {
      result: resultFromCandidate(
        picked,
        targetRole,
        'heuristic',
        0.7,
        `Load-balanced pick among ${candidates.length} "${targetRole}" candidate(s).`,
        candidates.length,
      ),
      warning: null,
    };
  }
}
