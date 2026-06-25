// Org-structure writes used by the picklist manager for entity-backed sources
// (departments & teams). Reads go through the unified field-options API; these
// reuse the existing departments endpoints for create/delete.
import { postJson, deleteJson, getJson } from './client';

const base = (orgId: number): string => `/api/organizations/${orgId}`;

export const createDepartment = (orgId: number, name: string) =>
  postJson<{ id: number; name: string }>(`${base(orgId)}/departments`, { name });

export const deleteDepartment = (orgId: number, id: number) =>
  deleteJson(`${base(orgId)}/departments/${id}`);

export const createTeam = (orgId: number, departmentId: number, name: string) =>
  postJson<{ id: number; name: string }>(`${base(orgId)}/departments/${departmentId}/teams`, { name });

export const deleteTeam = (orgId: number, id: number) => deleteJson(`${base(orgId)}/teams/${id}`);

// ── Distribution partners (reused Organization / User stubs) ──
export type PartnerKind = 'organization' | 'user';
export type PartnerItem = { value: string; label: string; kind: PartnerKind; claimed: boolean };

export const listPartners = (orgId: number) =>
  getJson<{ items: PartnerItem[] }>(`${base(orgId)}/partners`);

export const createPartner = (orgId: number, input: { kind: PartnerKind; name: string; email?: string }) =>
  postJson<PartnerItem>(`${base(orgId)}/partners`, input);

export const deletePartner = (orgId: number, value: string) =>
  deleteJson(`${base(orgId)}/partners/${encodeURIComponent(value)}`);
