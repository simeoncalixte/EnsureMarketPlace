/**
 * Common interface shared by every sanctions / watchlist screening integration.
 *
 * Each concrete provider is an **adapter** mapping a specific screening engine (a
 * commercial OFAC/EU/UN consolidated-list API, an internal list service, …) onto
 * this interface, and the connector selects between them at runtime via a
 * **strategy** (see `selectSanctionsProvider`). The pre-bind compliance stage only
 * ever depends on this interface, so the real and simulated engines are fully
 * interchangeable: same query, same `SanctionsScreenOutcome` shape.
 *
 * Mirrors the geocoding connector (`connectors/geocoding/GeocodeProvider.ts`)
 * deliberately so the provider families read the same way.
 */

export interface SanctionsScreenQuery {
  /** The party name to screen (insured, cedent, additional insured, owner). */
  name: string;
  /** Optional ISO-3166 alpha-2 country code to scope/bias the screen. */
  countryCode?: string;
}

/** A single hit/near-hit returned by a screening engine. */
export interface SanctionsMatch {
  /** Source list, e.g. 'OFAC SDN', 'EU Consolidated', 'UN'. */
  listName: string;
  /** The list entry name that matched. */
  matchedName: string;
  /** Normalized 0..1 match score (1 = exact). */
  score: number;
  /** Sanctions programs the entry belongs to, when known. */
  programs?: string[];
  /** Stable identifier for the list entry, when the engine provides one. */
  sourceId?: string | null;
}

/**
 * The normalized, provider-agnostic screening result.
 *   - `clear`           — no match against any configured list.
 *   - `potential_match` — fuzzy/partial match: routes to human review, not a hard block.
 *   - `hit`             — confirmed match: a hard block on bind.
 */
export interface SanctionsScreenOutcome {
  result: 'clear' | 'potential_match' | 'hit';
  /** The list version/edition screened against (proof-of-screening at bind time). */
  listVersion: string;
  matches: SanctionsMatch[];
  /** Name of the provider that produced this result (e.g. 'ofac-api', 'simulated'). */
  provider: string;
}

export interface SanctionsProvider {
  /** Stable identifier, e.g. 'ofac-api' (real) or 'simulated' (fallback). */
  readonly name: string;
  /**
   * Whether this provider can run in the current environment (required config
   * present). The strategy picks the first available provider in priority order —
   * the real API adapter wins when its config is set, otherwise the always-on
   * simulated adapter handles it.
   */
  isAvailable(): boolean;
  /**
   * Screen a single party name. Throws only on transport/engine errors (non-2xx,
   * network), which the caller treats as a per-party screening failure.
   */
  screen(query: SanctionsScreenQuery): Promise<SanctionsScreenOutcome>;
}
