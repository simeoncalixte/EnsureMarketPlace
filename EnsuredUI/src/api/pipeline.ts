// Pipeline processes API — requests under `/api/pipeline/processes`.
//
// All return the raw Response: callers branch on 401/403 vs other failures and
// parse their own `{ subscriptions }` / `{ subscription }` / board payloads.
import { apiRequest } from './client';
import type { LineOfBusinessPageTemplate, LineOfBusinessPageTemplateField, LineOfBusinessPageTemplateSection } from './marketplace';

// ─── Schema generation (suggested form) ─────────────────────────────────────────
/**
 * The suggested form is a superset of the line-of-business page template: same
 * field/section vocabulary plus `repeatable` sections (add/remove card lists),
 * `currency`/`percentage` field types, an `origin` tag (base scaffold vs AI
 * extension), a `component` marker (base sections rendered by an existing rich
 * component), and prefilled field `value`s.
 */
export type SchemaOrigin = 'base' | 'ai';

export type SuggestedFormField = LineOfBusinessPageTemplateField & {
  origin?: SchemaOrigin;
  value?: string | number | boolean | null;
};

export type SuggestedFormSection = Omit<LineOfBusinessPageTemplateSection, 'fields'> & {
  fields: SuggestedFormField[];
  repeatable?: boolean;
  origin?: SchemaOrigin;
  /** When set, this base section is rendered by an existing component, not dynamic fields. */
  component?: string | null;
};

export type SuggestedFormDefinition = Omit<LineOfBusinessPageTemplate, 'sections'> & {
  sections: SuggestedFormSection[];
};

export type SuggestedForm = {
  schema: SuggestedFormDefinition;
  source: 'gemini_schema' | 'heuristic_schema' | 'org_template';
  generatedAt: string;
};

/**
 * GET the suggested form generated for a submission by the schema-generation
 * stage. Best-effort: returns null when the stage has not run (404) or on any
 * failure, so the caller falls back to the baseline form.
 */
export async function loadSubmissionSuggestedForm(submissionId: number): Promise<SuggestedForm | null> {
  try {
    const response = await apiRequest(`/api/pipeline/schemaGeneration/${submissionId}`, { method: 'GET' });
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<SuggestedForm>;
    return data?.schema && Array.isArray(data.schema.sections) ? (data as SuggestedForm) : null;
  } catch {
    return null;
  }
}

/**
 * GET the deterministic baseline form — the same default the schema agent starts
 * from. Rendered until the agent has tailored a form for a specific submission.
 * Best-effort: returns null on any failure.
 */
export async function loadBaselineSuggestedForm(
  params: { lineOfBusinessCode?: string | null; lineOfBusinessLabel?: string | null; subjectCount?: number | null } = {},
): Promise<SuggestedForm | null> {
  const search = new URLSearchParams();
  if (params.lineOfBusinessCode) search.set('lineOfBusinessCode', params.lineOfBusinessCode);
  if (params.lineOfBusinessLabel) search.set('lineOfBusinessLabel', params.lineOfBusinessLabel);
  if (params.subjectCount != null) search.set('subjectCount', String(params.subjectCount));
  const query = search.toString();
  const path = query ? `/api/pipeline/schemaGeneration/baseline?${query}` : '/api/pipeline/schemaGeneration/baseline';
  try {
    const response = await apiRequest(path, { method: 'GET' });
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<SuggestedForm>;
    return data?.schema && Array.isArray(data.schema.sections) ? (data as SuggestedForm) : null;
  } catch {
    return null;
  }
}

/** GET /api/pipeline/processes/board — pipeline board state. */
export function getProcessBoard(): Promise<Response> {
  return apiRequest('/api/pipeline/processes/board', { method: 'GET' });
}

/** POST /api/pipeline/processes/submissions/{id}/advance — advance a submission. */
export function advanceSubmission(id: string | number): Promise<Response> {
  return apiRequest(`/api/pipeline/processes/submissions/${id}/advance`, { method: 'POST' });
}

/**
 * POST /api/pipeline/processes/submissions/{id}/rerun — re-run a stage (defaults
 * to the current/failed stage) for a submission. Optionally target a `stageKey`.
 */
export function rerunSubmission(id: string | number, stageKey?: string): Promise<Response> {
  return apiRequest(`/api/pipeline/processes/submissions/${id}/rerun`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stageKey ? { stageKey } : {}),
  });
}

/** GET /api/pipeline/processes/subscriptions — current process subscriptions. */
export function getProcessSubscriptions(): Promise<Response> {
  return apiRequest('/api/pipeline/processes/subscriptions', { method: 'GET' });
}

/** POST /api/pipeline/processes/subscriptions — subscribe / unsubscribe a stage. */
export function saveProcessSubscription(body: {
  eventKey: string;
  process: string;
  stage: string;
  enabled: boolean;
}): Promise<Response> {
  return apiRequest('/api/pipeline/processes/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
