import { EnrichmentData, SubmissionOutput } from '../../../db/models';
import { runStage } from '../stageResult';
import type { GeocodeProvider, NormalizedLocation } from '../connectors/geocoding/GeocodeProvider';
import { selectGeocodeProvider } from '../connectors/geocoding/selectGeocodeProvider';
import { resolveAndPersistGeography, type ResolvedGeography } from './geography';

type AnySubject = Record<string, any>;

/** One subject paired with the raw location string we will geocode. */
type LocatableUnit = {
  /** Index into the subjects array, or -1 for the submission-level location. */
  index: number;
  /** Human reference for warnings/output (label, else "subject N", else "submission"). */
  ref: string;
  rawLocation: string;
  subject: AnySubject;
};

/**
 * Location Discovery stage.
 *
 * Discovers and APPLIES normalized location data to every insured subject in a
 * submission: it reads each subject's raw `location` string (from the extraction
 * stage's `subjects[]`, or the submission-level `propertyLocation` for a single
 * unitemized risk), geocodes it through the selected provider, and writes the
 * resolved coordinates + normalized address back onto the subject.
 *
 * The provider is chosen by `selectGeocodeProvider` — the premium **Google**
 * Geocoding API when `GOOGLE_MAPS_API_KEY` is set, otherwise the open-source
 * **Nominatim** engine. Both return the identical `NormalizedLocation` shape, so
 * this stage is agnostic to which engine answered.
 *
 * ENHANCE, NEVER DEGRADE: persistence (SubmissionOutput augmentation, the
 * geography Address book, the EnrichmentData audit row) only runs when a real
 * submission id is present and is best-effort per subject — a provider error or a
 * single unresolvable address is recorded as a warning, never a stage failure.
 */
export class LocationDiscoveryService {
  private readonly provider: GeocodeProvider;

  /** The geocoding provider is injectable for testing; defaults to the env strategy. */
  constructor(deps: { provider?: GeocodeProvider } = {}) {
    this.provider = deps.provider ?? selectGeocodeProvider();
  }

  async process(payload: any): Promise<Record<string, unknown>> {
    return runStage('locationDiscovery', () => this.runLocationDiscovery(payload));
  }

  private async runLocationDiscovery(payload: any): Promise<Record<string, unknown>> {
    const submission = payload?.submission;
    const warnings: string[] = [];

    const extraction = await this.loadExtraction(payload, submission?.id);
    const subjects: AnySubject[] = Array.isArray(extraction.subjects) ? extraction.subjects : [];
    const units = collectLocatableUnits(subjects, extraction.propertyLocation);
    const countryCode = typeof extraction.countryCode === 'string' ? extraction.countryCode : undefined;

    if (units.length === 0) {
      return {
        ok: true,
        service: 'locationDiscovery',
        provider: this.provider.name,
        subjects,
        locations: [],
        total: 0,
        resolved: 0,
        unresolved: 0,
        warnings: ['No insured-subject locations found to discover'],
      };
    }

    // Geocode each DISTINCT raw string once (a portfolio often repeats an address);
    // a per-run cache keeps us within the open-source provider's rate limits.
    const cache = new Map<string, NormalizedLocation | null>();
    for (const unit of units) {
      if (cache.has(unit.rawLocation)) continue;
      try {
        cache.set(unit.rawLocation, await this.provider.geocode({ query: unit.rawLocation, countryCode }));
      } catch (err) {
        cache.set(unit.rawLocation, null);
        warnings.push(`Geocoding failed for "${unit.ref}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Resolve geography hierarchy + Address book once per distinct resolved place,
    // but only when we have a submission to attach to (pure geocode otherwise).
    const geoByPlace = new Map<string, ResolvedGeography>();
    if (submission?.id) {
      for (const location of cache.values()) {
        if (!location) continue;
        const key = placeKey(location);
        if (geoByPlace.has(key)) continue;
        geoByPlace.set(key, await resolveAndPersistGeography(location, submission.organizationId ?? null));
      }
    }

    const locations: Array<Record<string, unknown>> = [];
    let resolved = 0;
    for (const unit of units) {
      const location = cache.get(unit.rawLocation) ?? null;
      const geo = location ? geoByPlace.get(placeKey(location)) : undefined;
      if (location) {
        applyLocationToSubject(unit.subject, location, geo);
        resolved += 1;
      }
      locations.push({
        ref: unit.ref,
        index: unit.index,
        query: unit.rawLocation,
        resolved: Boolean(location),
        provider: location?.provider ?? null,
        formattedAddress: location?.formattedAddress ?? null,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        confidence: location?.confidence ?? null,
        addressId: geo?.addressId ?? null,
      });
    }

    if (submission?.id) {
      await this.persist(Number(submission.id), submission.organizationId ?? null, subjects, {
        provider: this.provider.name,
        locations,
        resolved,
        unresolved: units.length - resolved,
        total: units.length,
        warnings,
      });
    }

    return {
      ok: true,
      service: 'locationDiscovery',
      provider: this.provider.name,
      subjects,
      locations,
      total: units.length,
      resolved,
      unresolved: units.length - resolved,
      warnings,
    };
  }

  /**
   * Resolve the extraction record to read subjects from: prefer this run's upstream
   * output, else the persisted SubmissionOutput (so the stage can run standalone).
   */
  private async loadExtraction(payload: any, submissionId: unknown): Promise<Record<string, any>> {
    const fromPayload = payload?.extraction?.structuredData ?? payload?.extraction;
    if (fromPayload && typeof fromPayload === 'object') return fromPayload as Record<string, any>;

    if (submissionId != null) {
      const doc = await SubmissionOutput.findOne({ where: { submissionId: Number(submissionId) } });
      const structured = (doc?.structuredData ?? {}) as Record<string, any>;
      if (structured.extraction && typeof structured.extraction === 'object') return structured.extraction;
    }
    return {};
  }

  /**
   * Persist results: augment the SubmissionOutput (a dedicated `locationDiscovery`
   * block plus the geocoded `extraction.subjects` written back in place) and record
   * an EnrichmentData audit row. Best-effort — a persistence error degrades to a
   * warning rather than failing the stage.
   */
  private async persist(
    submissionId: number,
    organizationId: number | null,
    subjects: AnySubject[],
    summary: Record<string, unknown>,
  ): Promise<void> {
    const block = { ...summary, subjects, discoveredAt: new Date().toISOString() };
    try {
      let doc = await SubmissionOutput.findOne({ where: { submissionId } });
      if (!doc) {
        doc = await SubmissionOutput.create({
          submissionId,
          organizationId,
          structuredData: { locationDiscovery: block },
        });
      } else {
        const existing = (doc.structuredData ?? {}) as Record<string, any>;
        const existingExtraction = (existing.extraction ?? {}) as Record<string, any>;
        doc.structuredData = {
          ...existing,
          locationDiscovery: block,
          // Write the geocoded subjects back onto the extraction record so downstream
          // stages (canonicalization, modeling) read the enriched objects.
          extraction: { ...existingExtraction, subjects },
        };
        await doc.save();
      }

      await EnrichmentData.create({
        submissionId,
        organizationId,
        enrichmentType: 'location',
        data: block,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        `[locationDiscovery] persistence skipped for submission ${submissionId} (best-effort):`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

/** Build the geocodable unit list from subjects (+ a submission-level fallback). */
export function collectLocatableUnits(subjects: AnySubject[], propertyLocation: unknown): LocatableUnit[] {
  const units: LocatableUnit[] = [];
  subjects.forEach((subject, index) => {
    const rawLocation = typeof subject?.location === 'string' ? subject.location.trim() : '';
    if (!rawLocation) return;
    const label = typeof subject?.label === 'string' && subject.label.trim() ? subject.label.trim() : `subject ${index + 1}`;
    units.push({ index, ref: label, rawLocation, subject });
  });

  // Single unitemized risk: no subjects carry a location but the submission states one.
  if (units.length === 0 && typeof propertyLocation === 'string' && propertyLocation.trim()) {
    const subject: AnySubject = { label: 'Insured location', location: propertyLocation.trim() };
    subjects.push(subject);
    units.push({ index: subjects.length - 1, ref: 'Insured location', rawLocation: propertyLocation.trim(), subject });
  }
  return units;
}

/** Apply a resolved location + geography ids onto a subject in place (additive). */
export function applyLocationToSubject(
  subject: AnySubject,
  location: NormalizedLocation,
  geo: ResolvedGeography | undefined,
): void {
  subject.normalizedLocation = location;
  subject.latitude = location.latitude;
  subject.longitude = location.longitude;
  if (geo) {
    subject.addressId = geo.addressId;
    subject.countryId = geo.countryId;
    subject.stateProvinceId = geo.stateProvinceId;
    subject.cityId = geo.cityId;
  }
}

/** Stable dedupe key for a resolved location (placeId when present, else coords/text). */
function placeKey(location: NormalizedLocation): string {
  if (location.placeId) return `place:${location.placeId}`;
  if (location.latitude != null && location.longitude != null) return `coord:${location.latitude},${location.longitude}`;
  return `addr:${location.formattedAddress ?? ''}`;
}
