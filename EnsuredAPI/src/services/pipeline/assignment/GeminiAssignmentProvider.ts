import {
  createGeminiChat,
  extractJsonObject,
  geminiModel,
  geminiTimeoutMs,
  invokeAgentText,
  isGeminiConfigured,
} from '../agents/gemini';
import type { AssignmentCandidate } from './roleRouting';
import { fullName } from './roleRouting';

/**
 * Prompt revision, appended to the persisted `modelVersion` so an assignment can
 * be attributed to the exact prompt that produced it. Bump on ANY change to
 * `buildPrompt` (or the validation in `toChoice`).
 */
export const ASSIGNMENT_PROMPT_VERSION = 'p1';

/** What the assignment determiner sees: the target role, the submission's
 * type/line of business for context, and the eligible candidate roster. */
export type AssignmentAgentInput = {
  targetRole: string;
  submissionTypeCode: string | null;
  submissionTypeLabel: string | null;
  lineOfBusinessCode: string | null;
  lineOfBusinessLabel: string | null;
  /** Pre-filtered to users carrying `targetRole`. */
  candidates: AssignmentCandidate[];
};

/** The agent's pick — a userId from the candidate set, plus its rationale. */
export type AssignmentAgentChoice = {
  assignedUserId: number;
  confidence: number;
  reason: string;
};

/** Injectable high-precision seam, mirroring the other pipeline agents. */
export interface AssignmentAgent {
  /** Enabled whenever a Gemini key exists (LLM-primary convention). */
  isAvailable(): boolean;
  /** Choose the best assignee from the candidates; throws so the caller can fall back. */
  choose(input: AssignmentAgentInput): Promise<AssignmentAgentChoice>;
}

/**
 * Primary assignee selector: a Gemini-backed agent. Given the submission's
 * type/line of business and the roster of eligible people (with their current
 * load), it picks the single best owner — balancing workload and any role/
 * department fit. The chosen `assignedUserId` is validated against the candidate
 * set before it is trusted; an off-list id throws so the service falls back to
 * the deterministic load-balanced heuristic.
 *
 * PRIMARY whenever GEMINI_API_KEY is configured; the load-balanced heuristic in
 * `assignment/roleRouting.ts` is the fallback (no key / call fails / bad id).
 */
export class GeminiAssignmentAgent implements AssignmentAgent {
  private readonly env: NodeJS.ProcessEnv;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.env = env;
  }

  isAvailable(): boolean {
    return isGeminiConfigured(this.env);
  }

  async choose(input: AssignmentAgentInput): Promise<AssignmentAgentChoice> {
    const candidates = input.candidates ?? [];
    if (candidates.length === 0) throw new Error('GeminiAssignmentAgent: no candidates to choose from');

    const chat = await createGeminiChat(this.env, { json: true });
    const raw = await invokeAgentText(chat, buildPrompt(input), {
      agent: 'assignment',
      timeout: geminiTimeoutMs(this.env),
      env: this.env,
      promptVersion: ASSIGNMENT_PROMPT_VERSION,
    });
    return toChoice(extractJsonObject(raw), candidates);
  }
}

function buildPrompt(input: AssignmentAgentInput): string {
  const roster = input.candidates
    .map((c) => {
      const where = [
        c.departmentName ? `dept: ${c.departmentName}` : null,
        c.teamName ? `team: ${c.teamName}` : null,
      ]
        .filter(Boolean)
        .join(', ');
      const name = fullName(c) || `user ${c.userId}`;
      return `- userId ${c.userId}: ${name} (role: ${c.role}; open assignments: ${c.openAssignments}${where ? `; ${where}` : ''})`;
    })
    .join('\n');

  return [
    'You are an insurance operations work-allocation assistant.',
    `Assign the submission below to exactly ONE person from the eligible roster.`,
    `All listed people already carry the required role: "${input.targetRole}".`,
    '',
    'Submission context:',
    `- transaction type: ${input.submissionTypeLabel ?? input.submissionTypeCode ?? 'unknown'}`,
    `- line of business: ${input.lineOfBusinessLabel ?? input.lineOfBusinessCode ?? 'unknown'}`,
    '',
    'Eligible people (choose the userId of exactly one):',
    roster,
    '',
    'Rules:',
    '1. Balance workload — prefer people with FEWER open assignments, all else equal.',
    '2. Prefer a department/team whose name fits the line of business when there is a clear match.',
    '3. You MUST choose a userId that appears in the list above; never invent one.',
    '4. "confidence" is 0..1: high when one person is the clear fit, lower when it is a near-tie.',
    'Respond with ONE JSON object and nothing else, of the form:',
    '{"assignedUserId":<userId from the list>,"confidence":<0..1>,"reason":"<short rationale>"}',
  ].join('\n');
}

function clamp01(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/** Validate the model's pick against the candidate set and map to the choice shape. */
function toChoice(
  parsed: Record<string, unknown>,
  candidates: readonly AssignmentCandidate[],
): AssignmentAgentChoice {
  const userId = Number(parsed.assignedUserId);
  if (!Number.isInteger(userId) || !candidates.some((c) => c.userId === userId)) {
    throw new Error(`GeminiAssignmentAgent: model chose user "${parsed.assignedUserId}" not in the candidate set`);
  }
  return {
    assignedUserId: userId,
    confidence: clamp01(parsed.confidence),
    reason: typeof parsed.reason === 'string' ? parsed.reason.trim().slice(0, 280) : '',
  };
}
