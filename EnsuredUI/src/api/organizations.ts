// Organizations API.
import { getJson } from './client';

// ─── Organizations listing ─────────────────────────────────────────────────────
/** GET /api/Organizations — admin organization listing (capital-O path). */
export function listOrganizations<T = unknown>(): Promise<T[]> {
  return getJson<T[]>('/api/Organizations');
}
