// Navigation API — requests under `/api/navigation`.
//
// The sidebar is no longer hardcoded per role in the client. Instead the server
// returns the exact menu the current session is allowed to see, so a user is
// never shown an entry point to a workspace their role can't operate.
import { getJson } from './client';
import type { NavItem } from '../xds/components/Navigation';

/** Shape returned by `GET /api/navigation`. */
export type SessionNavigation = {
  /** The viewer's system role (insurer | investor | analyst | admin). */
  role: string;
  /** Default landing route for this role. */
  home: string;
  /** The navigation tree to render. `active` is computed client-side. */
  items: NavItem[];
  generatedAt: string;
};

/**
 * GET /api/navigation — role-scoped sidebar for the current session.
 * Throws `ApiError` on a non-ok response (e.g. 401) so the caller can fall back.
 */
export function getSessionNavigation(): Promise<SessionNavigation> {
  return getJson<SessionNavigation>('/api/navigation');
}
