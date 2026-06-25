// Pipeline processes API — requests under `/api/pipeline/processes`.
//
// All return the raw Response: callers branch on 401/403 vs other failures and
// parse their own `{ subscriptions }` / `{ subscription }` / board payloads.
import { apiRequest } from './client';
import { getApiBase } from '../lib/api';
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

// ─── Insured subjects (pipeline-extracted, with inline per-subject templates) ────

/**
 * One insured subject as the insuredSubject stage persisted it: identity + the
 * open-ended attribute bag + the per-subject form `template` the create-coverage
 * page resolves (the LLM-generated form, or the attribute-derived fallback).
 */
export type PipelineInsuredSubject = {
  index: number;
  name: string | null;
  subjectType: string | null;
  address: string | null;
  lineOfBusinessCode: string | null;
  lineOfBusinessLabel: string | null;
  attributes: Record<string, string | number | boolean | null>;
  template?: LineOfBusinessPageTemplate | null;
};

export type PipelineInsuredSubjectsResult = {
  modelVersion: string;
  subjectCount: number;
  subjects: PipelineInsuredSubject[];
  linesOfBusiness: Array<{ code: string; label: string; subjectCount: number }>;
  source: string;
};

/**
 * GET the insured subjects extracted for a submission by the insuredSubject
 * stage. Best-effort: returns null when the stage has not run (404) or on any
 * failure, so the caller falls back to a single blank subject.
 */
export async function loadSubmissionInsuredSubjects(
  submissionId: number,
): Promise<PipelineInsuredSubjectsResult | null> {
  try {
    const response = await apiRequest(`/api/pipeline/insured-subject/${submissionId}`, { method: 'GET' });
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<PipelineInsuredSubjectsResult>;
    return Array.isArray(data?.subjects) ? (data as PipelineInsuredSubjectsResult) : null;
  } catch {
    return null;
  }
}

// ─── Lazy-loaded selection options ──────────────────────────────────────────────

export type SchemaOptionItem = { value: string; label: string };

export type SchemaOptionSet = {
  optionSetKey: string;
  label: string | null;
  items: SchemaOptionItem[];
};

/**
 * Lazy-load the selection options for a generated form field by its
 * `optionSetKey`. Generated `select`/`radio` fields reference their choices by key
 * rather than inlining them, so the page fetches the items on demand the first
 * time it renders the field. Best-effort: returns null on a 404 or any failure, so
 * the field simply renders with no options.
 */
export async function loadSchemaOptionSet(
  optionSetKey: string,
  organizationId?: number | null,
): Promise<SchemaOptionSet | null> {
  if (!optionSetKey) return null;
  const search = new URLSearchParams();
  if (organizationId != null) search.set('organizationId', String(organizationId));
  const query = search.toString();
  const path = `/api/pipeline/schemaGeneration/option-sets/${encodeURIComponent(optionSetKey)}${query ? `?${query}` : ''}`;
  try {
    const response = await apiRequest(path, { method: 'GET' });
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<SchemaOptionSet>;
    return data?.optionSetKey && Array.isArray(data.items) ? (data as SchemaOptionSet) : null;
  } catch {
    return null;
  }
}

// ─── Submission files (Documents section) ───────────────────────────────────────

export type SubmissionFileInfo = {
  id: number;
  fileName: string;
  fileType: string | null;
  /** Browser MIME type the content endpoint serves — drives the preview kind. */
  mimeType: string | null;
  fileSize: number | null;
  uploadedAt: string | null;
  /** Absolute URL streaming the file inline for previews. */
  contentUrl: string | null;
  /** OCR-extracted text — the universal preview fallback for any file type. */
  textPreview: string | null;
  textLength: number | null;
};

/**
 * GET the files attached to a submission, with preview metadata. Best-effort:
 * returns [] on any failure so the Documents section degrades to an empty state.
 */
export async function loadSubmissionFiles(submissionId: number): Promise<SubmissionFileInfo[]> {
  try {
    const response = await apiRequest(`/api/pipeline/processes/submissions/${submissionId}/files`, { method: 'GET' });
    if (!response.ok) return [];
    const data = (await response.json()) as { files?: Array<Partial<SubmissionFileInfo>> };
    const apiBase = getApiBase();
    return (data.files ?? [])
      .filter((f): f is SubmissionFileInfo => f != null && typeof f.id === 'number' && typeof f.fileName === 'string')
      .map((f) => ({
        ...f,
        contentUrl: f.contentUrl ? `${apiBase}${f.contentUrl}` : null,
      }));
  } catch {
    return [];
  }
}

// ─── Agent activity (AI transcript) ─────────────────────────────────────────────

/**
 * One LLM call made while processing a submission: the exact prompt the
 * pipeline sent and the raw model response. `live` rows mirror a stage that is
 * still running (not yet persisted), with `status: 'running'` while the model
 * has not answered yet.
 */
export type AgentActivityCall = {
  id: number | null;
  runId: number | null;
  executionId: number | null;
  stageKey: string | null;
  seq: number;
  agent: string;
  model: string | null;
  promptVersion: string | null;
  prompt: string | null;
  responseText: string | null;
  status: 'running' | 'completed' | 'failed';
  errorMessage: string | null;
  durationMs: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  live: boolean;
};

export type AgentActivity = {
  submissionId: number;
  calls: AgentActivityCall[];
  /** True while at least one call is in flight — keep polling. */
  active: boolean;
};

/**
 * GET the AI-agent transcript for a submission. Best-effort: returns null on
 * any failure so the activity panel degrades to its empty state.
 */
export async function loadAgentActivity(submissionId: number): Promise<AgentActivity | null> {
  try {
    const response = await apiRequest(`/api/pipeline/processes/submissions/${submissionId}/agent-activity`, {
      method: 'GET',
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<AgentActivity>;
    return Array.isArray(data?.calls) ? (data as AgentActivity) : null;
  } catch {
    return null;
  }
}

/**
 * GET /api/pipeline/processes/board — pipeline board state. Pass a submission
 * `type` code (e.g. 'claim') to scope the board to that route's lanes and that
 * type's submissions; omit it for the combined "all submissions" board.
 */
export function getProcessBoard(type?: string): Promise<Response> {
  const query = type ? `?type=${encodeURIComponent(type)}` : '';
  return apiRequest(`/api/pipeline/processes/board${query}`, { method: 'GET' });
}

/** GET /api/pipeline/processes/flow — complete-pipeline flow (Sankey) data. */
export function getProcessFlow(): Promise<Response> {
  return apiRequest('/api/pipeline/processes/flow', { method: 'GET' });
}

/**
 * POST /api/seed/pipeline-flow — simulate a multi-stage history for the org's
 * submissions (no OCR/LLM run) so the board and the flow Sankey have real stage
 * transitions to show. Dev/demo affordance.
 */
export function seedPipelineFlow(reset = true): Promise<Response> {
  return apiRequest('/api/seed/pipeline-flow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reset }),
  });
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
