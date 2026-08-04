// Per-user UI preferences — `/api/me/preferences/:key`. A lean personal key/value
// store that syncs across devices (e.g. the map submission-type colors).
import { getJson, putJson } from './client'

/** Read one preference; resolves to `null` when unset or unauthenticated. */
export function getUserPreference<T = unknown>(key: string): Promise<{ value: T | null }> {
  return getJson<{ value: T | null }>(`/api/me/preferences/${encodeURIComponent(key)}`)
}

/** Upsert one preference value. */
export function putUserPreference<T = unknown>(key: string, value: T): Promise<{ value: T }> {
  return putJson<{ value: T }>(`/api/me/preferences/${encodeURIComponent(key)}`, { value })
}

/** Preference key for the map's per-submission-type colour overrides. */
export const MAP_SUBMISSION_TYPE_COLORS_KEY = 'map_submission_type_colors'
