/**
 * Pure helpers for the Geographic Appetite map.
 *
 * The map edits a pair of jurisdiction lists (preferred / excluded) by ISO
 * 3166-1 alpha-2 country code. These functions are intentionally free of any
 * map/DOM concern so the include/exclude logic can be unit-tested directly,
 * while {@link RegionAppetiteMap} owns the imperative Mapbox work.
 */

export type RegionState = 'preferred' | 'excluded' | 'neutral'

export const normCode = (code: string): string => code.trim().toUpperCase()

/** True for an ISO 3166-1 alpha-2 country code (the granularity the map edits). */
export const isCountryCode = (code: string): boolean => /^[A-Z]{2}$/.test(normCode(code))

const has = (list: string[], code: string): boolean => {
  const c = normCode(code)
  return list.some((x) => normCode(x) === c)
}

/** Current state of a country within the two lists (excluded wins over preferred). */
export function regionStateOf(code: string, preferred: string[], excluded: string[]): RegionState {
  if (has(excluded, code)) return 'excluded'
  if (has(preferred, code)) return 'preferred'
  return 'neutral'
}

/**
 * Cycle a country's membership: neutral → preferred → excluded → neutral.
 *
 * Returns fresh arrays with only the clicked country moved — every other entry
 * (including non-country values such as `"FL"`) is preserved, so the map never
 * clobbers sub-country jurisdictions the user typed by hand.
 */
export function cycleRegion(
  code: string,
  preferred: string[],
  excluded: string[],
): { preferred: string[]; excluded: string[] } {
  const c = normCode(code)
  // Preserve the entry's original casing when (re)adding it — country codes
  // arrive already-uppercased, but state/city names (e.g. "US/Florida") must stay
  // readable. Membership is still compared case-insensitively via normCode.
  const orig = code.trim()
  const stripped = {
    preferred: preferred.filter((x) => normCode(x) !== c),
    excluded: excluded.filter((x) => normCode(x) !== c),
  }
  const state = regionStateOf(c, preferred, excluded)
  if (state === 'neutral') return { preferred: [...stripped.preferred, orig], excluded: stripped.excluded }
  if (state === 'preferred') return { preferred: stripped.preferred, excluded: [...stripped.excluded, orig] }
  return stripped // excluded → neutral
}

/** Just the country-code entries of a list, normalized and de-duplicated. */
export function countryCodes(list: string[] | undefined): string[] {
  const out: string[] = []
  for (const raw of list ?? []) {
    if (!isCountryCode(raw)) continue
    const c = normCode(raw)
    if (!out.includes(c)) out.push(c)
  }
  return out
}

/** Entries that are NOT country codes (e.g. `"FL"` is a country code shape but
 *  region names / 3-letter codes are not) — preserved verbatim for the text editor. */
export function nonCountryEntries(list: string[] | undefined): string[] {
  return (list ?? []).filter((x) => !isCountryCode(x))
}

// ─── Region references (for boundary-shape display) ──────────────────────────────
//
// A jurisdiction entry encodes its granularity with a slash-delimited, human-
// readable scheme so the map can fetch and render the right boundary:
//   "US"               → country  (rendered from the Mapbox country tileset)
//   "US/Florida"       → state / province
//   "US/Florida/Tampa" → city / locality
// Country codes still match the tileset by ISO alpha-2; state/city entries are
// resolved to a polygon via the geolocation shape endpoint.

export type RegionKind = 'country' | 'state' | 'city'

/** What a map click resolves to, based on the current zoom level. */
export type ClickGranularity = 'country' | 'state' | 'city'

/** Zoom thresholds at which clicking the map switches granularity. */
export const STATE_ZOOM = 4
export const CITY_ZOOM = 6.5

/** Map the current zoom to the granularity a click should target. */
export function granularityForZoom(zoom: number): ClickGranularity {
  if (zoom >= CITY_ZOOM) return 'city'
  if (zoom >= STATE_ZOOM) return 'state'
  return 'country'
}

/** A parsed jurisdiction entry, shaped to drive `/api/geolocation/shape`. */
export type RegionRef = {
  kind: RegionKind
  /** ISO-2 for country; name (or code) for state/city. */
  ref: string
  /** Scopes state/city lookups to a country (ISO alpha-2). */
  countryCode?: string
  /** Scopes city lookups to a state/province. */
  state?: string
  /** The original entry string this was parsed from. */
  entry: string
}

/** A fetched boundary ready for the map overlay, tagged with its appetite state. */
export type RegionShapeFeature = {
  /** The jurisdiction entry string this shape belongs to. */
  entry: string
  /** Graded appetite stance for this shape (drives the overlay fill color). */
  appetiteStance?: AppetiteStance | null
  /** RFC 7946 geometry (Polygon | MultiPolygon | Point). */
  geometry: unknown
}

// ─── Graded appetite stance ──────────────────────────────────────────────────
//
// Mirrors the `governance.appetite.stance` option set, ordered most → least
// favorable. Used to group the capacity-mode overlay so regions read as bands of
// appetite rather than a flat include/exclude split. The tear sheet still edits
// stance via the data-driven OptionSelect; this ordering/labelling is presentation
// only (an overlay legend), so it can stay a local constant.

export const APPETITE_STANCE_ORDER = ['target', 'acceptable', 'restricted', 'refer', 'decline'] as const
export type AppetiteStance = (typeof APPETITE_STANCE_ORDER)[number]

export const APPETITE_STANCE_LABEL: Record<AppetiteStance, string> = {
  target: 'Target',
  acceptable: 'Acceptable',
  restricted: 'Restricted',
  refer: 'Refer',
  decline: 'Decline',
}

/** Coerce a stored stance to a known bucket, or null when unset / unrecognized. */
export function normalizeStance(stance: string | null | undefined): AppetiteStance | null {
  const s = (stance ?? '').trim().toLowerCase()
  return (APPETITE_STANCE_ORDER as readonly string[]).includes(s) ? (s as AppetiteStance) : null
}

// ─── Per-jurisdiction stance map ─────────────────────────────────────────────
//
// The geographic appetite is now a single graded model: every jurisdiction the
// underwriter selects carries an appetite stance (target → decline). This map
// replaces the old binary preferred/excluded pair as the thing the map edits.
// Keys are the encoded entry strings ("US", "US/Florida"); casing is preserved
// for display, but all membership tests are case-insensitive.

export type JurisdictionStances = Record<string, AppetiteStance>

/** Which stances count as "in appetite, clean" vs "out" when projecting back to
 *  the binary preferred/excluded lists the appetite engine still consumes.
 *  `restricted`/`refer` map to neither — writable, but flagged for referral. */
const PREFERRED_STANCES: readonly AppetiteStance[] = ['target', 'acceptable']
const EXCLUDED_STANCES: readonly AppetiteStance[] = ['decline']

/** Case-insensitive stance lookup for an entry. */
export function stanceOf(entry: string, stances: JurisdictionStances): AppetiteStance | null {
  const k = entry.trim().toLowerCase()
  for (const [key, val] of Object.entries(stances)) {
    if (key.trim().toLowerCase() === k) return normalizeStance(val)
  }
  return null
}

/** Fresh map with `entry` set to `stance` (preserving casing), or removed when null. */
export function setStance(entry: string, stance: AppetiteStance | null, stances: JurisdictionStances): JurisdictionStances {
  const k = entry.trim().toLowerCase()
  const next: JurisdictionStances = {}
  for (const [key, val] of Object.entries(stances)) {
    if (key.trim().toLowerCase() !== k) next[key] = val
  }
  if (stance) next[entry.trim()] = stance
  return next
}

/** Advance a region one step along the stance ramp:
 *  neutral → target → acceptable → restricted → refer → decline → neutral. */
export function cycleStanceFor(entry: string, stances: JurisdictionStances): JurisdictionStances {
  const cur = stanceOf(entry, stances)
  const i = cur ? APPETITE_STANCE_ORDER.indexOf(cur) : -1
  const nextStance = i < 0 ? APPETITE_STANCE_ORDER[0] : i >= APPETITE_STANCE_ORDER.length - 1 ? null : APPETITE_STANCE_ORDER[i + 1]
  return setStance(entry, nextStance, stances)
}

/** Just the country-code → stance pairs (uppercased ISO-2), for the tileset fill. */
export function countryStances(stances: JurisdictionStances): Record<string, AppetiteStance> {
  const out: Record<string, AppetiteStance> = {}
  for (const [entry, val] of Object.entries(stances)) {
    if (!isCountryCode(entry)) continue
    const s = normalizeStance(val)
    if (s) out[normCode(entry)] = s
  }
  return out
}

/** State/city entries that need a fetched boundary overlay (countries use the tileset). */
export function shapeEntriesFromStances(stances: JurisdictionStances): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const entry of Object.keys(stances)) {
    const ref = parseRegionRef(entry)
    if (!ref || ref.kind === 'country') continue
    const key = entry.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(entry.trim())
  }
  return out
}

/** Project the graded stance map back to the binary lists the backend appetite
 *  engine reads. Keeps the engine working untouched while the UI is stance-only. */
export function deriveInclusion(stances: JurisdictionStances): { preferred: string[]; excluded: string[] } {
  const preferred: string[] = []
  const excluded: string[] = []
  for (const [entry, val] of Object.entries(stances)) {
    const s = normalizeStance(val)
    if (!s) continue
    if (EXCLUDED_STANCES.includes(s)) excluded.push(entry.trim())
    else if (PREFERRED_STANCES.includes(s)) preferred.push(entry.trim())
    // restricted / refer → neither list (flagged for referral by the engine)
  }
  return { preferred, excluded }
}

/** Seed an initial stance map from legacy preferred/excluded data so existing
 *  definitions render under the graded model (preferred → target, excluded → decline). */
export function stancesFromInclusion(preferred: string[] | undefined, excluded: string[] | undefined): JurisdictionStances {
  const out: JurisdictionStances = {}
  for (const e of preferred ?? []) if (e?.trim()) out[e.trim()] = 'target'
  for (const e of excluded ?? []) if (e?.trim()) out[e.trim()] = 'decline' // exclusion wins
  return out
}

/** A place suggestion surfaced by the search box. */
export type RegionSearchOption = {
  /** Primary label (e.g. "Tampa"). */
  label: string
  /** Secondary label (e.g. "Florida, US"). */
  sublabel?: string
  /** The encoded entry to add to the appetite list when picked. */
  entry: string
}

/** Parse a jurisdiction entry into its granularity + lookup scope. */
export function parseRegionRef(entry: string): RegionRef | null {
  const raw = (entry ?? '').trim()
  if (!raw) return null
  const parts = raw.split('/').map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) return null
  if (parts.length === 1) {
    // A bare entry is a country: uppercase a 2-letter code, else pass through.
    const ref = isCountryCode(parts[0]) ? normCode(parts[0]) : parts[0]
    return { kind: 'country', ref, entry: raw }
  }
  if (parts.length === 2) {
    return { kind: 'state', ref: parts[1], countryCode: normCode(parts[0]), entry: raw }
  }
  return { kind: 'city', ref: parts[2], state: parts[1], countryCode: normCode(parts[0]), entry: raw }
}

/** Build the encoded entry string for a geocoded place (from a search result). */
export function deriveRegionRef(place: {
  countryCode?: string | null
  state?: string | null
  city?: string | null
}): string | null {
  const cc = place.countryCode ? normCode(place.countryCode) : null
  if (!cc) return null
  if (place.city && place.state) return `${cc}/${place.state}/${place.city}`
  if (place.state) return `${cc}/${place.state}`
  return cc
}

/** Human-readable label for a jurisdiction entry, most-specific first.
 *  "US" → "US", "US/Florida" → "Florida, US", "US/Florida/Tampa" → "Tampa, Florida". */
export function regionLabel(entry: string): string {
  const ref = parseRegionRef(entry)
  if (!ref) return entry
  if (ref.kind === 'country') return ref.ref
  if (ref.kind === 'state') return `${ref.ref}, ${ref.countryCode}`
  return `${ref.ref}, ${ref.state}`
}

/** Stable, case-insensitive key for a parsed ref (de-dupe + cache keying). */
export function regionRefKey(ref: RegionRef): string {
  return [ref.kind, ref.countryCode ?? '', ref.state ?? '', ref.ref].join('|').toLowerCase()
}

/** The entries from a list that need a fetched boundary overlay (state/city only;
 *  countries are drawn from the Mapbox tileset). De-duplicated, order-preserving. */
export function shapeEntries(preferred: string[], excluded: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const entry of [...(preferred ?? []), ...(excluded ?? [])]) {
    const ref = parseRegionRef(entry)
    if (!ref || ref.kind === 'country') continue
    const key = entry.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(entry.trim())
  }
  return out
}
