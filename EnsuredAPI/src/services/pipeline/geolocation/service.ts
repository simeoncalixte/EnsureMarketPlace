/**
 * Unified geolocation orchestrator.
 *
 * One seam over every geolocation engine. For each method it runs **local-dataset
 * first** (our DB via {@link LocalDatasetProvider}); only on a low-confidence/empty
 * local result does it fall through the remote providers, in priority order, picking
 * the first that is available AND declares the needed capability. Successful remote
 * results are **written back** into our DB (the Address book via
 * `resolveAndPersistGeography`, boundaries into `geo_shapes`) so the dataset grows
 * into a cache and subsequent identical requests are served locally.
 *
 * Graceful by contract: every remote call is wrapped — a failing provider becomes a
 * warning and the chain continues; the service returns `{ ok: true, ... }` and never
 * throws on provider errors.
 */
import { GeoShape as GeoShapeModel } from '../../../db/models';
import { resolveAndPersistGeography } from '../locationDiscovery/geography';
import type {
  AddressVerification,
  ForwardQuery,
  GeolocationCapability,
  GeolocationProvider,
  GeoShape,
  NormalizedLocation,
  PlaceCandidate,
  ReverseQuery,
  ShapeRef,
  StructuredQuery,
} from '../connectors/geolocation/GeolocationProvider';
import { defaultGeolocationProviders } from '../connectors/geolocation/selectGeolocationProviders';

export type CandidatesResult = {
  ok: true;
  source: string;
  provider: string | null;
  candidates: PlaceCandidate[];
  warnings: string[];
};

export type ReverseResult = {
  ok: true;
  source: string;
  provider: string | null;
  result: NormalizedLocation | null;
  warnings: string[];
};

export type ShapeResult = {
  ok: true;
  source: string;
  provider: string | null;
  shape: GeoShape | null;
  warnings: string[];
};

export type VerifyResult = {
  ok: true;
  source: string;
  provider: string | null;
  verification: AddressVerification;
  warnings: string[];
};

export class GeolocationService {
  private readonly providers: GeolocationProvider[];

  constructor(deps: { providers?: GeolocationProvider[] } = {}) {
    this.providers = deps.providers ?? defaultGeolocationProviders();
  }

  /** Available providers that implement a given capability, local first. */
  private pick(capability: GeolocationCapability): GeolocationProvider[] {
    // The 'shape' capability is served by the `fetchShape` method; every other
    // capability's method shares its name.
    const method = capability === 'shape' ? 'fetchShape' : capability;
    return this.providers.filter(
      (p) =>
        p.isAvailable() &&
        p.capabilities[capability] &&
        typeof (p as unknown as Record<string, unknown>)[method] === 'function',
    );
  }

  // ─── Forward search ───────────────────────────────────────────────────────────

  async search(query: ForwardQuery): Promise<CandidatesResult> {
    return this.candidateFlow('search', (p) => p.search!(query), confidentCandidates);
  }

  async structured(query: StructuredQuery): Promise<CandidatesResult> {
    return this.candidateFlow('structured', (p) => p.structured!(query), confidentCandidates);
  }

  async autocomplete(query: ForwardQuery): Promise<CandidatesResult> {
    // Typeahead prefers provider-native autocomplete when available. If local
    // autocomplete is empty and remote providers do not implement dedicated
    // autocomplete, fall back to their normal forward search so suggestions
    // still appear in environments without a pre-seeded local city dataset.
    return this.candidateFlow(
      'search',
      (provider) => (provider.capabilities.autocomplete ? provider.autocomplete!(query) : provider.search!(query)),
      (candidates) => candidates.length > 0
    );
  }

  /** Shared local-first flow for the multi-candidate methods. */
  private async candidateFlow(
    capability: GeolocationCapability,
    call: (p: GeolocationProvider) => Promise<PlaceCandidate[]>,
    isConfident: (candidates: PlaceCandidate[]) => boolean,
  ): Promise<CandidatesResult> {
    const warnings: string[] = [];
    const providers = this.pick(capability);
    const local = providers.find((p) => p.name === 'local');
    const remotes = providers.filter((p) => p.name !== 'local');

    let localResults: PlaceCandidate[] = [];
    if (local) {
      try {
        localResults = await call(local);
        if (isConfident(localResults)) {
          return { ok: true, source: 'local', provider: 'local', candidates: localResults, warnings };
        }
      } catch (err) {
        warnings.push(`local: ${message(err)}`);
      }
    }

    for (const provider of remotes) {
      try {
        const results = await call(provider);
        if (results.length) {
          await this.persistCandidates(results);
          return { ok: true, source: provider.name, provider: provider.name, candidates: results, warnings };
        }
      } catch (err) {
        warnings.push(`${provider.name}: ${message(err)}`);
      }
    }

    // No remote match — return whatever (possibly coarse) local hit we had.
    return {
      ok: true,
      source: localResults.length ? 'local' : 'none',
      provider: localResults.length ? 'local' : null,
      candidates: localResults,
      warnings,
    };
  }

  // ─── Reverse ──────────────────────────────────────────────────────────────────

  async reverse(query: ReverseQuery): Promise<ReverseResult> {
    const warnings: string[] = [];
    const providers = this.pick('reverse');
    const local = providers.find((p) => p.name === 'local');
    const remotes = providers.filter((p) => p.name !== 'local');

    let localResult: NormalizedLocation | null = null;
    if (local) {
      try {
        localResult = await local.reverse!(query);
        // A street-level local hit short-circuits; a coarse city hit still enriches.
        if (localResult && localResult.line1 && localResult.latitude != null) {
          return { ok: true, source: 'local', provider: 'local', result: localResult, warnings };
        }
      } catch (err) {
        warnings.push(`local: ${message(err)}`);
      }
    }

    for (const provider of remotes) {
      try {
        const result = await provider.reverse!(query);
        if (result) {
          await this.persistCandidates([result]);
          return { ok: true, source: provider.name, provider: provider.name, result, warnings };
        }
      } catch (err) {
        warnings.push(`${provider.name}: ${message(err)}`);
      }
    }

    return {
      ok: true,
      source: localResult ? 'local' : 'none',
      provider: localResult ? 'local' : null,
      result: localResult,
      warnings,
    };
  }

  // ─── Shape ────────────────────────────────────────────────────────────────────

  async fetchShape(ref: ShapeRef): Promise<ShapeResult> {
    const warnings: string[] = [];
    const providers = this.pick('shape');
    const local = providers.find((p) => p.name === 'local');
    const remotes = providers.filter((p) => p.name !== 'local');

    if (local) {
      try {
        const cached = await local.fetchShape!(ref);
        if (cached) return { ok: true, source: 'local', provider: 'local', shape: cached, warnings };
      } catch (err) {
        warnings.push(`local: ${message(err)}`);
      }
    }

    for (const provider of remotes) {
      try {
        const shape = await provider.fetchShape!(ref);
        if (shape) {
          await this.persistShape(ref, shape);
          return { ok: true, source: provider.name, provider: provider.name, shape, warnings };
        }
      } catch (err) {
        warnings.push(`${provider.name}: ${message(err)}`);
      }
    }

    return { ok: true, source: 'none', provider: null, shape: null, warnings };
  }

  // ─── Verify ───────────────────────────────────────────────────────────────────

  async verify(address: StructuredQuery): Promise<VerifyResult> {
    const warnings: string[] = [];
    const providers = this.pick('verify');
    const local = providers.find((p) => p.name === 'local');
    const remotes = providers.filter((p) => p.name !== 'local');

    let localVerification: AddressVerification | null = null;
    if (local) {
      try {
        localVerification = await local.verify!(address);
        // Only a clean local 'verified' short-circuits; corrected/unverified seek a
        // higher-authority remote verifier when one is available.
        if (localVerification.verdict === 'verified') {
          return { ok: true, source: 'local', provider: 'local', verification: localVerification, warnings };
        }
      } catch (err) {
        warnings.push(`local: ${message(err)}`);
      }
    }

    for (const provider of remotes) {
      try {
        const verification = await provider.verify!(address);
        if (verification.verdict !== 'unverified' && verification.normalized) {
          await this.persistCandidates([verification.normalized]);
        }
        return { ok: true, source: provider.name, provider: provider.name, verification, warnings };
      } catch (err) {
        warnings.push(`${provider.name}: ${message(err)}`);
      }
    }

    const verification: AddressVerification =
      localVerification ?? { verdict: 'unverified', normalized: null, confidence: 0, changes: [], provider: 'local' };
    return {
      ok: true,
      source: localVerification ? 'local' : 'none',
      provider: localVerification ? 'local' : null,
      verification,
      warnings,
    };
  }

  // ─── Write-back persistence (best-effort; never throws) ──────────────────────────

  private async persistCandidates(candidates: NormalizedLocation[]): Promise<void> {
    for (const candidate of candidates) {
      try {
        await resolveAndPersistGeography(candidate, null);
      } catch {
        /* enhance, never degrade — caching failures must not fail the request */
      }
    }
  }

  private async persistShape(ref: ShapeRef, shape: GeoShape): Promise<void> {
    try {
      const where = {
        kind: ref.kind,
        ref: ref.ref,
        countryCode: ref.countryCode ? ref.countryCode.toUpperCase() : null,
      };
      const values = {
        ...where,
        stateRef: ref.state ?? null,
        name: shape.name,
        geometry: shape.geometry,
        bbox: shape.bbox,
        provider: shape.provider,
        source: shape.provider,
        fetchedAt: new Date(),
      };
      const existing = await GeoShapeModel.findOne({ where });
      if (existing) {
        await existing.update(values);
      } else {
        await GeoShapeModel.create(values);
      }
    } catch {
      /* caching failures are non-fatal */
    }
  }
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** A local forward hit is "confident" when it is street-level or scores high. */
function confidentCandidates(candidates: PlaceCandidate[]): boolean {
  return candidates.some(
    (c) => (c.line1 != null && c.latitude != null && c.longitude != null) || c.confidence >= 0.8,
  );
}
