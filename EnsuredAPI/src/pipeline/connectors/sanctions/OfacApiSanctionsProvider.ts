import {
  SanctionsMatch,
  SanctionsProvider,
  SanctionsScreenOutcome,
  SanctionsScreenQuery,
} from './SanctionsProvider';

/**
 * Premium adapter for a commercial sanctions-screening API (OFAC SDN + EU/UN
 * consolidated lists). Activated when `SANCTIONS_API_URL` and `SANCTIONS_API_KEY`
 * are configured; otherwise the connector falls back to the simulated provider.
 *
 * The wire shape is intentionally generic (most screening vendors expose a
 * name-search returning scored matches + a list edition). Adjust `mapResponse`
 * to a specific vendor's payload when one is wired in production. Mirrors
 * `connectors/geocoding/GoogleGeocodeProvider.ts`.
 */
export class OfacApiSanctionsProvider implements SanctionsProvider {
  readonly name = 'ofac-api';
  private readonly apiUrl?: string;
  private readonly apiKey?: string;
  /** Score at/above which a match is treated as a confirmed hit (else review). */
  private readonly hitThreshold: number;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.apiUrl = env.SANCTIONS_API_URL;
    this.apiKey = env.SANCTIONS_API_KEY;
    const threshold = Number(env.SANCTIONS_HIT_THRESHOLD);
    this.hitThreshold = Number.isFinite(threshold) ? threshold : 0.9;
  }

  isAvailable(): boolean {
    return Boolean(this.apiUrl && this.apiKey);
  }

  async screen(query: SanctionsScreenQuery): Promise<SanctionsScreenOutcome> {
    if (!this.apiUrl || !this.apiKey) {
      throw new Error('OfacApiSanctionsProvider: SANCTIONS_API_URL / SANCTIONS_API_KEY are not configured');
    }
    const name = String(query.name ?? '').trim();
    if (!name) {
      return { result: 'clear', listVersion: 'n/a', matches: [], provider: this.name };
    }

    const params = new URLSearchParams({ name });
    if (query.countryCode) params.set('country', query.countryCode.toUpperCase());

    const res = await fetch(`${this.apiUrl}?${params.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`OfacApiSanctionsProvider: screening API error ${res.status}`);
    }

    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return this.mapResponse(body);
  }

  private mapResponse(body: Record<string, unknown>): SanctionsScreenOutcome {
    const listVersion = typeof body.listVersion === 'string' ? body.listVersion : 'unknown';
    const rawMatches = Array.isArray(body.matches) ? (body.matches as Record<string, unknown>[]) : [];
    const matches: SanctionsMatch[] = rawMatches.map((entry) => ({
      listName: String(entry.listName ?? entry.source ?? 'Sanctions list'),
      matchedName: String(entry.matchedName ?? entry.name ?? ''),
      score: Number(entry.score ?? 0),
      programs: Array.isArray(entry.programs) ? entry.programs.map(String) : undefined,
      sourceId: entry.sourceId != null ? String(entry.sourceId) : null,
    }));

    const topScore = matches.reduce((max, m) => (m.score > max ? m.score : max), 0);
    const result: SanctionsScreenOutcome['result'] =
      matches.length === 0 ? 'clear' : topScore >= this.hitThreshold ? 'hit' : 'potential_match';

    return { result, listVersion, matches, provider: this.name };
  }
}
