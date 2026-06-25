// Users API — requests under `/api/users`.
import { getJson } from './client';

/** A named reference loaded alongside a user (organization/department/team). */
export interface ApiNamedRef {
  id: number;
  name: string;
}

export interface ApiUser {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  organizationId?: number | null;
  departmentId?: number | null;
  teamId?: number | null;
  /** Eager-loaded references so the UI can show names, not just ids. */
  organization?: ApiNamedRef | null;
  department?: ApiNamedRef | null;
  team?: ApiNamedRef | null;
}

/** GET /api/users — all users (callers filter client-side as needed). */
export function listUsers(): Promise<ApiUser[]> {
  return getJson<ApiUser[]>('/api/users');
}
