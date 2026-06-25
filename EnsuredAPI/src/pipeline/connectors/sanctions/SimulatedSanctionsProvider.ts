import {
  SanctionsMatch,
  SanctionsProvider,
  SanctionsScreenOutcome,
  SanctionsScreenQuery,
} from './SanctionsProvider';

/**
 * Always-available fallback screening adapter (no external dependency), used when
 * no real sanctions API is configured. It screens against a small, clearly
 * FICTIONAL demo list so the pre-bind compliance gate is exercisable end-to-end
 * without a vendor — exactly the simulated-fallback pattern the OCR/geocoding/
 * Stripe connectors use.
 *
 * Deterministic by design (same name → same outcome) so tests and demos are
 * stable: a name containing a blocked token is a `hit`; a watchlist token is a
 * `potential_match`; everything else is `clear`.
 */

/** Fictional blocked entities — a name containing one of these tokens is a hit. */
const DEMO_BLOCKLIST: ReadonlyArray<{ token: string; listName: string; programs: string[]; sourceId: string }> = [
  { token: 'redoctober', listName: 'OFAC SDN (sim)', programs: ['CYBER2'], sourceId: 'SIM-0001' },
  { token: 'black mamba holdings', listName: 'OFAC SDN (sim)', programs: ['SDNTK'], sourceId: 'SIM-0002' },
  { token: 'volkov industrial', listName: 'EU Consolidated (sim)', programs: ['UKRAINE-EO13662'], sourceId: 'SIM-0003' },
  { token: 'crimson syndicate', listName: 'UN Consolidated (sim)', programs: ['NPWMD'], sourceId: 'SIM-0004' },
];

/** Watchlist tokens — a name containing one of these is a fuzzy potential match. */
const DEMO_WATCHLIST: ReadonlyArray<string> = ['shell trading', 'offshore nominee', 'sanction'];

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

export class SimulatedSanctionsProvider implements SanctionsProvider {
  readonly name = 'simulated';

  isAvailable(): boolean {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async screen(query: SanctionsScreenQuery): Promise<SanctionsScreenOutcome> {
    const name = normalize(String(query.name ?? ''));
    const listVersion = this.listVersion();

    if (!name) {
      return { result: 'clear', listVersion, matches: [], provider: this.name };
    }

    const blocked = DEMO_BLOCKLIST.find((entry) => name.includes(entry.token));
    if (blocked) {
      const match: SanctionsMatch = {
        listName: blocked.listName,
        matchedName: blocked.token,
        score: 1,
        programs: blocked.programs,
        sourceId: blocked.sourceId,
      };
      return { result: 'hit', listVersion, matches: [match], provider: this.name };
    }

    const watched = DEMO_WATCHLIST.find((token) => name.includes(token));
    if (watched) {
      const match: SanctionsMatch = {
        listName: 'Watchlist (sim)',
        matchedName: watched,
        score: 0.6,
        sourceId: null,
      };
      return { result: 'potential_match', listVersion, matches: [match], provider: this.name };
    }

    return { result: 'clear', listVersion, matches: [], provider: this.name };
  }

  /** Synthetic, date-stamped list edition so each screen records when it ran. */
  private listVersion(): string {
    const today = new Date().toISOString().slice(0, 10);
    return `OFAC-SDN-SIM-${today}`;
  }
}
