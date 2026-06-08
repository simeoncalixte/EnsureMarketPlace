import { createGeminiChat, extractJsonObject, geminiTimeoutMs, isGeminiConfigured, messageText } from '../agents/gemini';

export type WorkflowInput = {
  validation: Record<string, unknown>;
  preRating: Record<string, unknown>;
  oracleAttestation: Record<string, unknown>;
  capacityMatch: Record<string, unknown>;
};

export type WorkflowDecision = {
  decision: string;
  suggestedSubmissionStatus: string;
  reasons: string[];
};

/** Injectable seam, mirroring the other judgment-stage agents. */
export interface WorkflowAgent {
  isAvailable(): boolean;
  decide(input: WorkflowInput): Promise<WorkflowDecision>;
}

export const ALLOWED_DECISIONS = [
  'REVIEW',
  'OUT_OF_APPETITE',
  'MORE_INFO',
  'ORACLE_INCOMPATIBLE',
  'ROUTE_PARTNER_POOL',
  'PRIORITY_ROUTE',
] as const;

const ALLOWED_STATUSES = ['modeling', 'rejected', 'submitted'] as const;

/**
 * Primary triage decider: a **LangChain agent backed by a Gemini model** that
 * reads the upstream stage signals (validation, pre-rating, oracle attestation,
 * capacity match) and produces the workflow decision + suggested status. Active
 * whenever a Gemini key is configured; the deterministic rule chain in
 * `workflow/service.ts` is the fallback (no key / call fails / invalid output).
 *
 * NOTE: the agent only chooses a routing DECISION from a fixed enum — it never
 * invents the numeric scores or capacity figures, which stay deterministic
 * upstream.
 */
export class GeminiWorkflowAgent implements WorkflowAgent {
  private readonly env: NodeJS.ProcessEnv;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.env = env;
  }

  isAvailable(): boolean {
    return isGeminiConfigured(this.env);
  }

  async decide(input: WorkflowInput): Promise<WorkflowDecision> {
    const chat = await createGeminiChat(this.env, { json: true });
    const response = await chat.invoke(buildPrompt(input), { timeout: geminiTimeoutMs(this.env) });
    return validateDecision(extractJsonObject(messageText(response?.content)));
  }
}

function buildPrompt(input: WorkflowInput): string {
  return [
    'You are an insurance submission triage router. Based ONLY on the upstream',
    'signals below, choose the routing decision and the suggested submission status.',
    '',
    `Allowed "decision" values: ${ALLOWED_DECISIONS.join(', ')}.`,
    `Allowed "suggestedSubmissionStatus" values: ${ALLOWED_STATUSES.join(', ')}.`,
    '',
    'Routing rubric (apply in priority order):',
    '- If validation is out of appetite -> decision OUT_OF_APPETITE, status rejected.',
    '- Else if validation is flagged for more info -> decision MORE_INFO, status submitted.',
    '- Else if oracle attestation is not smart-contract ready -> decision ORACLE_INCOMPATIBLE, status submitted.',
    '- Else if capacity match routes to the partner pool -> decision ROUTE_PARTNER_POOL, status modeling.',
    '- Else if the pre-rating grade is A or B -> decision PRIORITY_ROUTE, status modeling.',
    '- Otherwise -> decision REVIEW, status modeling.',
    '',
    'Respond with ONE JSON object: {"decision":"...","suggestedSubmissionStatus":"...","reasons":["<short>"]}',
    '',
    `validation: ${JSON.stringify(input.validation).slice(0, 2000)}`,
    `preRating: ${JSON.stringify(input.preRating).slice(0, 1000)}`,
    `oracleAttestation: ${JSON.stringify(input.oracleAttestation).slice(0, 1000)}`,
    `capacityMatch: ${JSON.stringify(input.capacityMatch).slice(0, 1000)}`,
  ].join('\n');
}

function validateDecision(parsed: Record<string, unknown>): WorkflowDecision {
  const decision = String(parsed.decision ?? '').trim();
  if (!(ALLOWED_DECISIONS as readonly string[]).includes(decision)) {
    throw new Error(`GeminiWorkflowAgent: model returned an invalid decision "${decision}"`);
  }
  const statusRaw = String(parsed.suggestedSubmissionStatus ?? '').trim();
  const suggestedSubmissionStatus = (ALLOWED_STATUSES as readonly string[]).includes(statusRaw) ? statusRaw : 'modeling';
  const reasons = Array.isArray(parsed.reasons) ? parsed.reasons.map((r) => String(r)).filter(Boolean).slice(0, 10) : [];
  return { decision, suggestedSubmissionStatus, reasons };
}
