// Underwriting API — requests under `/api/underwriting`.
import { apiRequest } from './client';

/**
 * GET /api/underwriting/submissions — submissions board payload.
 * Raw Response: caller checks `res.ok` then parses its `BoardResponse`.
 */
export function getSubmissions(): Promise<Response> {
  return apiRequest('/api/underwriting/submissions', { method: 'GET' });
}

/** PATCH /api/underwriting/submissions/{id}/status — move a submission. Raw Response. */
export function updateSubmissionStatus(id: string | number, status: string): Promise<Response> {
  return apiRequest(`/api/underwriting/submissions/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

/**
 * POST /api/underwriting/submissions/{id}/compliance — run the pre-bind
 * compliance screen (sanctions + carrier licensing) and persist a clearance.
 * Raw Response: caller checks `res.ok` then refetches the board. Re-running
 * appends a new clearance (audit trail), like recompute → new pricing version.
 */
export function runCompliance(id: string | number): Promise<Response> {
  return apiRequest(`/api/underwriting/submissions/${id}/compliance`, { method: 'POST' });
}

/** PUT /api/underwriting/submissions/config — save board configuration. Raw Response. */
export function saveSubmissionsConfig(config: unknown): Promise<Response> {
  return apiRequest('/api/underwriting/submissions/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
}

/**
 * POST /api/underwriting/submissions/{id}/quote — issue (or re-issue) a quote
 * from the submission's latest priced version. Gated on a passed compliance
 * clearance (409 otherwise). Raw Response: caller refetches the board.
 */
export function issueQuote(id: string | number): Promise<Response> {
  return apiRequest(`/api/underwriting/submissions/${id}/quote`, { method: 'POST' });
}

/** PATCH /api/underwriting/submissions/{id}/quote — accept | decline | withdraw. Raw Response. */
export function transitionQuote(id: string | number, action: 'accept' | 'decline' | 'withdraw'): Promise<Response> {
  return apiRequest(`/api/underwriting/submissions/${id}/quote`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
}

/**
 * POST /api/underwriting/submissions/{id}/bind — bind an accepted quote into an
 * in-force Policy (+ issuance PolicyVersion + exposures). Raw Response.
 */
export function bindSubmission(id: string | number): Promise<Response> {
  return apiRequest(`/api/underwriting/submissions/${id}/bind`, { method: 'POST' });
}

/** GET /api/underwriting/policies — the organization's in-force book. Raw Response. */
export function getPolicies(): Promise<Response> {
  return apiRequest('/api/underwriting/policies', { method: 'GET' });
}

/** GET /api/underwriting/policies/{id} — policy detail with versions + exposures. Raw Response. */
export function getPolicy(id: string | number): Promise<Response> {
  return apiRequest(`/api/underwriting/policies/${id}`, { method: 'GET' });
}
