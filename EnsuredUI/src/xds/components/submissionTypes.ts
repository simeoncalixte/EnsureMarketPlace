// Canonical submission (transaction) type taxonomy for the map's nested filter
// and per-type colouring. Codes MUST match the backend source of truth:
// EnsuredAPI/src/db/seed-data/submissionTypeTaxonomy.ts (SUBMISSION_TYPE_CODES).
// Only the 10 primary types are colourable/filterable leaves; the domains are
// grouping headers (also used as select-all parents in the UI).

export type SubmissionTypeLeaf = { code: string; label: string }
export type SubmissionTypeDomain = { key: string; label: string; types: SubmissionTypeLeaf[] }

export const SUBMISSION_TYPE_DOMAINS: SubmissionTypeDomain[] = [
  {
    key: 'direct',
    label: 'Direct business',
    types: [
      { code: 'new_business', label: 'New business' },
      { code: 'renewal', label: 'Renewal' },
      { code: 'quote_request', label: 'Quote request' },
    ],
  },
  {
    key: 'policy_changes',
    label: 'Policy changes',
    types: [
      { code: 'endorsement', label: 'Endorsement' },
      { code: 'cancellation', label: 'Cancellation' },
    ],
  },
  {
    key: 'claims_admin',
    label: 'Claims & admin',
    types: [
      { code: 'claim', label: 'Claim' },
      { code: 'audit', label: 'Audit' },
    ],
  },
  {
    key: 'reinsurance',
    label: 'Reinsurance',
    types: [
      { code: 'treaty_reinsurance', label: 'Treaty' },
      { code: 'facultative_reinsurance', label: 'Facultative' },
    ],
  },
  {
    key: 'other',
    label: 'Other',
    types: [{ code: 'inquiry', label: 'Inquiry' }],
  },
]

/** Flat list of every primary type leaf, in domain order. */
export const SUBMISSION_TYPE_LEAVES: SubmissionTypeLeaf[] = SUBMISSION_TYPE_DOMAINS.flatMap((d) => d.types)
export const SUBMISSION_TYPE_CODES: string[] = SUBMISSION_TYPE_LEAVES.map((t) => t.code)
export const SUBMISSION_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  SUBMISSION_TYPE_LEAVES.map((t) => [t.code, t.label]),
)

// Default per-type colours (concrete hex — Mapbox paint can't resolve CSS vars).
// Mirror the dataViz palette; users override these via their saved preferences.
export const DEFAULT_SUBMISSION_TYPE_COLORS: Record<string, string> = {
  new_business: '#22c55e',
  renewal: '#4b8eff',
  quote_request: '#7dd3fc',
  endorsement: '#fbbf24',
  cancellation: '#ef4444',
  claim: '#f97316',
  audit: '#a78bfa',
  treaty_reinsurance: '#2dd4bf',
  facultative_reinsurance: '#6366f1',
  inquiry: '#64748b',
}

/** Fallback colour for an untyped/unknown submission. */
export const SUBMISSION_TYPE_FALLBACK_COLOR = '#64748b'

/** Swatch palette offered in the per-type colour picker. */
export const SUBMISSION_TYPE_PALETTE: string[] = [
  '#22c55e', '#4b8eff', '#7dd3fc', '#fbbf24', '#f97316', '#ef4444',
  '#a78bfa', '#2dd4bf', '#6366f1', '#34d399', '#c084fc', '#64748b',
]

/** Merge user overrides over the defaults into a complete code→hex map. */
export function resolveSubmissionTypeColors(
  overrides: Record<string, string> | null | undefined,
): Record<string, string> {
  return { ...DEFAULT_SUBMISSION_TYPE_COLORS, ...(overrides ?? {}) }
}
