// Organizations API.
//
// Note the two distinct, case-sensitive path roots the backend exposes:
//   - GET /api/Organizations            (capital O) — admin org listing
//   - /api/organizations/{id}/appetite  (lowercase) — appetite profile + rules
// Both are preserved verbatim.
import { apiRequest, getJson, putJson } from './client';

// ─── Appetite types (wire format) ──────────────────────────────────────────────
export type AppetiteSeverity = 'reject' | 'flag' | 'warn';

export interface AppetiteProfile {
  id: number;
  organizationId: number;
  name: string;
  description: string | null;
  status: string;
  isDefault: boolean;
  currency: string;
  totalDeployableCapital: string | null;
  minTargetYield: string | null;
  maxLineSize: string | null;
  minCoverageLimit: string | null;
  maxCoverageLimit: string | null;
  capacityByPeril: Record<string, number>;
  preferredPerils: string[];
  excludedPerils: string[];
  allowedLinesOfBusiness: string[];
  preferredJurisdictions: string[];
  excludedJurisdictions: string[];
  minDataQualityScore: number | null;
  requiredFields: string[];
  rules?: ValidationRule[];
}

export interface ValidationRule {
  id: number;
  appetiteProfileId: number;
  organizationId: number;
  name: string;
  description: string | null;
  field: string;
  operator: string;
  value: unknown;
  severity: AppetiteSeverity;
  enabled: boolean;
  sortOrder: number;
}

export type AppetiteProfilePatch = Partial<Omit<AppetiteProfile, 'id' | 'organizationId' | 'isDefault' | 'rules'>>;
export type ValidationRuleInput = Partial<Omit<ValidationRule, 'id' | 'appetiteProfileId' | 'organizationId'>>;

// ─── Organizations listing ─────────────────────────────────────────────────────
/** GET /api/Organizations — admin organization listing (capital-O path). */
export function listOrganizations<T = unknown>(): Promise<T[]> {
  return getJson<T[]>('/api/Organizations');
}

// ─── Appetite profile ──────────────────────────────────────────────────────────
/** GET /api/organizations/{id}/appetite — appetite profile (with rules). */
export function getAppetite(organizationId: number): Promise<AppetiteProfile> {
  return getJson<AppetiteProfile>(`/api/organizations/${organizationId}/appetite`);
}

/** PUT /api/organizations/{id}/appetite — update the appetite profile. */
export function saveAppetite(organizationId: number, patch: AppetiteProfilePatch): Promise<AppetiteProfile> {
  return putJson<AppetiteProfile>(`/api/organizations/${organizationId}/appetite`, patch);
}

// ─── Appetite rules ────────────────────────────────────────────────────────────
// Rule create/update return the raw Response so the hook can surface the API's
// `{ error, issues }` body verbatim via `readAppetiteRuleError`.

/** POST /api/organizations/{id}/appetite/rules — create a validation rule. */
export function createAppetiteRule(organizationId: number, input: ValidationRuleInput): Promise<Response> {
  return apiRequest(`/api/organizations/${organizationId}/appetite/rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

/** PUT /api/organizations/{id}/appetite/rules/{ruleId} — update a validation rule. */
export function updateAppetiteRule(organizationId: number, ruleId: number, input: ValidationRuleInput): Promise<Response> {
  return apiRequest(`/api/organizations/${organizationId}/appetite/rules/${ruleId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

/** DELETE /api/organizations/{id}/appetite/rules/{ruleId} — delete a rule (204-tolerant). */
export function deleteAppetiteRule(organizationId: number, ruleId: number): Promise<void> {
  return apiRequest(`/api/organizations/${organizationId}/appetite/rules/${ruleId}`, { method: 'DELETE' }).then((res) => {
    if (!res.ok && res.status !== 204) throw new Error(`Failed to delete rule: ${res.status}`);
  });
}

/**
 * Surface the API's 400 `{ error, issues }` body as a readable message so the
 * user sees *why* a rule was rejected instead of a bare status code.
 */
export async function readAppetiteRuleError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (Array.isArray(body?.issues) && body.issues.length) return body.issues.join('; ');
    if (typeof body?.error === 'string') return body.error;
  } catch {
    /* non-JSON body */
  }
  return `${fallback}: ${res.status}`;
}
