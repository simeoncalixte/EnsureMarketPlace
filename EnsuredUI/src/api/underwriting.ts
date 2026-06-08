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

/** PUT /api/underwriting/submissions/config — save board configuration. Raw Response. */
export function saveSubmissionsConfig(config: unknown): Promise<Response> {
  return apiRequest('/api/underwriting/submissions/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
}
