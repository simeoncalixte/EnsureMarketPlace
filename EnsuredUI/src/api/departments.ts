// Departments & Teams API client.
// Requests under `/api/organizations/{id}/...`, mirroring governance.ts.
import { getJson, postJson, putJson, deleteJson } from './client';

export interface Team {
  id: number;
  departmentId: number;
  organizationId: number;
  name: string;
  code: string | null;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface Department {
  id: number;
  organizationId: number;
  name: string;
  code: string | null;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  /** Included by the list/get endpoints. */
  teams?: Team[];
}

export interface DepartmentInput {
  name: string;
  code?: string | null;
  description?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export type TeamInput = DepartmentInput;

/** A user's department/team assignment. Omit a field to leave it unchanged;
 * send `null` to clear it. */
export interface AssignmentInput {
  departmentId?: number | null;
  teamId?: number | null;
}

const base = (orgId: number) => `/api/organizations/${orgId}`;

// ── Departments ──
export const listDepartments = (orgId: number) =>
  getJson<Department[]>(`${base(orgId)}/departments`);
export const getDepartment = (orgId: number, deptId: number) =>
  getJson<Department>(`${base(orgId)}/departments/${deptId}`);
export const createDepartment = (orgId: number, input: DepartmentInput) =>
  postJson<Department>(`${base(orgId)}/departments`, input);
export const updateDepartment = (orgId: number, deptId: number, input: Partial<DepartmentInput>) =>
  putJson<Department>(`${base(orgId)}/departments/${deptId}`, input);
export const deleteDepartment = (orgId: number, deptId: number) =>
  deleteJson(`${base(orgId)}/departments/${deptId}`);

// ── Teams (nested under a department) ──
export const listTeams = (orgId: number, deptId: number) =>
  getJson<Team[]>(`${base(orgId)}/departments/${deptId}/teams`);
export const createTeam = (orgId: number, deptId: number, input: TeamInput) =>
  postJson<Team>(`${base(orgId)}/departments/${deptId}/teams`, input);
export const updateTeam = (orgId: number, teamId: number, input: Partial<TeamInput>) =>
  putJson<Team>(`${base(orgId)}/teams/${teamId}`, input);
export const deleteTeam = (orgId: number, teamId: number) =>
  deleteJson(`${base(orgId)}/teams/${teamId}`);

// ── Membership ──
export const listDepartmentMembers = (orgId: number, deptId: number) =>
  getJson<unknown[]>(`${base(orgId)}/departments/${deptId}/members`);
export const listTeamMembers = (orgId: number, teamId: number) =>
  getJson<unknown[]>(`${base(orgId)}/teams/${teamId}/members`);

/** PUT /api/organizations/:id/users/:userId/assignment */
export const assignUser = (orgId: number, userId: number, input: AssignmentInput) =>
  putJson(`${base(orgId)}/users/${userId}/assignment`, input);
