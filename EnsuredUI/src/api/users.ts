// Users API — requests under `/api/users`.
import { getJson } from './client';

export interface ApiUser {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  organizationId?: number | null;
}

/** GET /api/users — all users (callers filter client-side as needed). */
export function listUsers(): Promise<ApiUser[]> {
  return getJson<ApiUser[]>('/api/users');
}
