// Unified field-options API — the one vocabulary <DynamicSelect> speaks for every
// dynamic dropdown. Option sets are tenant-overridable picklists (global default +
// tenant overlay); entities are live org-scoped reference rows.
import { getJson, postJson, deleteJson } from './client';

export interface ResolvedItem {
  value: string;
  label: string;
  scope: 'global' | 'tenant';
  hidden: boolean;
}
export interface ResolvedOptionSet {
  optionSetKey: string;
  label: string | null;
  /** Visible items for a select. */
  items: Array<{ value: string; label: string }>;
  /** Every item incl. hidden/scope — for the picklist manager. */
  allItems: ResolvedItem[];
}
export interface EntityOption {
  // Numeric for department/team/user; a `org:<id>` / `user:<id>` string for partner.
  value: number | string;
  label: string;
}

const base = (orgId: number): string => `/api/organizations/${orgId}/field-options`;

// ── Option sets (tenant-overridable picklists) ──
export const resolveOptionSet = (orgId: number, key: string) =>
  getJson<ResolvedOptionSet>(`${base(orgId)}/option-set/${encodeURIComponent(key)}`);

export const addOptionItem = (orgId: number, key: string, label: string, value?: string) =>
  postJson<ResolvedOptionSet>(`${base(orgId)}/option-set/${encodeURIComponent(key)}/items`, { label, value });

export const removeOptionItem = (orgId: number, key: string, value: string) =>
  deleteJson<ResolvedOptionSet>(`${base(orgId)}/option-set/${encodeURIComponent(key)}/items/${encodeURIComponent(value)}`);

// ── Entities (live reference data) ──
// 'partner' is a combined list of partner orgs + users (distribution partners);
// its option values are `org:<id>` / `user:<id>` strings, not numeric ids.
// 'peril' is a global, system-wide taxonomy (not org-scoped).
export type EntityKind = 'department' | 'team' | 'user' | 'partner' | 'peril';

export const listEntityOptions = (
  orgId: number,
  entity: EntityKind,
  params?: { departmentId?: number | null },
) => {
  const qs =
    params?.departmentId != null ? `?departmentId=${encodeURIComponent(String(params.departmentId))}` : '';
  return getJson<{ items: EntityOption[] }>(`${base(orgId)}/entity/${entity}${qs}`);
};
