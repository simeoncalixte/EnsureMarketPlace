import { Op } from 'sequelize';
import { Address, City, Country, GeoShape as GeoShapeModel, StateProvince } from '../../../db/models';
import {
  resolveCityId,
  resolveCountryId,
  resolveStateProvinceId,
} from '../../locationDiscovery/geography';
import type { NormalizedLocation } from '../geocoding/GeocodeProvider';
import type {
  AddressVerification,
  ForwardQuery,
  GeolocationCapabilities,
  GeolocationProvider,
  GeoShape,
  PlaceCandidate,
  ReverseQuery,
  ShapeRef,
  StructuredQuery,
  VerificationVerdict,
} from './GeolocationProvider';
import { num } from './util';

/**
 * The local-dataset-first provider: answers every method from our OWN database
 * (the `Address` book, the Continent→Country→StateProvince→City hierarchy, and the
 * `geo_shapes` boundary cache) with ZERO network calls. It is always available and
 * declares every capability, but returns empty / low-confidence results on a miss —
 * the signal the orchestrator uses to fall through to a remote provider.
 *
 * Reuses the existing geography resolution helpers (`resolveCountryId` /
 * `resolveStateProvinceId` / `resolveCityId`) so name/code matching stays identical
 * to the location-discovery stage.
 */
export class LocalDatasetProvider implements GeolocationProvider {
  readonly name = 'local';

  readonly capabilities: GeolocationCapabilities = {
    search: true,
    structured: true,
    reverse: true,
    shape: true,
    verify: true,
    autocomplete: true,
  };

  /** Always available — it is just our database. */
  isAvailable(): boolean {
    return true;
  }

  async search(query: ForwardQuery): Promise<PlaceCandidate[]> {
    const q = String(query.query ?? '').trim();
    if (!q) return [];
    const limit = clampLimit(query.limit);
    const like = `%${q}%`;

    const addressWhere: Record<string, unknown> = {
      [Op.or]: [
        { formattedAddress: { [Op.iLike]: like } },
        { line1: { [Op.iLike]: like } },
        { cityName: { [Op.iLike]: like } },
      ],
    };
    if (query.countryCode) addressWhere.countryCode = query.countryCode.toUpperCase();

    const addresses = await Address.findAll({ where: addressWhere, limit });
    const candidates = addresses.map(addressToLocation);

    // Supplement with coarse city matches when the address book is thin.
    if (candidates.length < limit) {
      const cityWhere: Record<string, unknown> = {
        [Op.or]: [{ name: { [Op.iLike]: like } }, { nameAscii: { [Op.iLike]: like } }],
      };
      const cities = await City.findAll({
        where: cityWhere,
        order: [['population', 'DESC NULLS LAST'] as unknown as [string, string]],
        limit: limit - candidates.length,
      });
      candidates.push(...(await Promise.all(cities.map((c) => cityToLocation(c)))));
    }
    return candidates;
  }

  async structured(query: StructuredQuery): Promise<PlaceCandidate[]> {
    const limit = clampLimit(query.limit);
    const countryId = await resolveCountryId(query.countryCode ?? null);
    const stateProvinceId = await resolveStateProvinceId(countryId, query.state ?? null);
    const cityId = await resolveCityId(countryId, stateProvinceId, query.city ?? null);

    const where: Record<string, unknown> = {};
    if (countryId) where.countryId = countryId;
    if (cityId) where.cityId = cityId;
    if (query.postalCode) where.postalCode = { [Op.iLike]: query.postalCode };
    if (query.line1) where.line1 = { [Op.iLike]: `%${query.line1}%` };

    if (Object.keys(where).length > 0) {
      const addresses = await Address.findAll({ where, limit });
      if (addresses.length) return addresses.map(addressToLocation);
    }

    // No street-level Address — fall back to the resolved city centroid (coarse).
    if (cityId) {
      const city = await City.findByPk(cityId);
      if (city) return [await cityToLocation(city)];
    }
    return [];
  }

  async reverse(query: ReverseQuery): Promise<NormalizedLocation | null> {
    if (!Number.isFinite(query.latitude) || !Number.isFinite(query.longitude)) return null;

    // Try the Address book first (street-level). A stored address is a specific
    // building, so only accept it when the query point is essentially on top of it
    // — the book is sparse, and a far "nearest" hit would otherwise short-circuit
    // the orchestrator (it trusts any street-level local result) and answer for a
    // point dozens of km away. Beyond the cap we return null and let a remote
    // provider geocode the point accurately.
    for (const delta of [0.05, 0.5]) {
      const addresses = await Address.findAll({
        where: boundingBox(query, delta),
        limit: 100,
      });
      const best = nearest(addresses, query, ADDRESS_MATCH_KM);
      if (best) return addressToLocation(best);
    }

    // Fall back to the nearest known city centroid (coarse — does not short-circuit
    // the orchestrator), still bounded so a distant centroid can't masquerade as
    // the clicked location.
    for (const delta of [0.5, 2]) {
      const cities = await City.findAll({ where: boundingBox(query, delta), limit: 100 });
      const best = nearest(cities, query, CITY_MATCH_KM);
      if (best) return cityToLocation(best);
    }
    return null;
  }

  async fetchShape(ref: ShapeRef): Promise<GeoShape | null> {
    const where: Record<string, unknown> = { kind: ref.kind, ref: { [Op.iLike]: ref.ref } };
    if (ref.countryCode) where.countryCode = ref.countryCode.toUpperCase();
    const row = await GeoShapeModel.findOne({ where });
    if (!row || !row.geometry) return null;
    return {
      kind: ref.kind,
      ref: row.ref,
      name: row.name,
      countryCode: row.countryCode,
      geometry: row.geometry,
      bbox: Array.isArray(row.bbox) ? (row.bbox as [number, number, number, number]) : null,
      provider: row.provider,
      source: 'local',
    };
  }

  async verify(address: StructuredQuery): Promise<AddressVerification> {
    const wantCountry = Boolean(address.countryCode);
    const wantState = Boolean(address.state);
    const wantCity = Boolean(address.city);

    const country = wantCountry
      ? await Country.findOne({ where: { iso2: (address.countryCode as string).toUpperCase() } })
      : null;
    const countryId = country?.id ?? null;
    const stateId = await resolveStateProvinceId(countryId, address.state ?? null);
    const state = stateId ? await StateProvince.findByPk(stateId) : null;
    const cityId = await resolveCityId(countryId, stateId, address.city ?? null);
    const city = cityId ? await City.findByPk(cityId) : null;

    const countryOk = !wantCountry || Boolean(country);
    const stateOk = !wantState || Boolean(state);
    const cityOk = !wantCity || Boolean(city);

    // Nothing to check, or a supplied admin component couldn't be resolved → unverified.
    if (!(wantCountry || wantState || wantCity) || !countryOk || !stateOk || !cityOk) {
      return { verdict: 'unverified', normalized: null, confidence: 0, changes: [], provider: this.name };
    }

    // All supplied admin components resolved. Detect normalization (e.g. casing /
    // spelling differs from our canonical name) → 'corrected', else 'verified'.
    const changes: string[] = [];
    if (wantState && state && !equalsLoose(address.state, state.name)) changes.push(`state→${state.name}`);
    if (wantCity && city && !equalsLoose(address.city, city.name)) changes.push(`city→${city.name}`);

    const verdict: VerificationVerdict = changes.length ? 'corrected' : 'verified';
    const lat = num(city?.latitude) ?? num(state?.latitude) ?? num(country?.latitude);
    const lng = num(city?.longitude) ?? num(state?.longitude) ?? num(country?.longitude);

    const normalized: NormalizedLocation = {
      formattedAddress: [address.line1, city?.name ?? address.city, state?.name ?? address.state, country?.iso2]
        .filter(Boolean)
        .join(', ') || null,
      line1: address.line1 ?? null,
      line2: address.line2 ?? null,
      city: city?.name ?? address.city ?? null,
      state: state?.name ?? address.state ?? null,
      postalCode: address.postalCode ?? null,
      countryCode: country?.iso2 ?? address.countryCode?.toUpperCase() ?? null,
      latitude: lat,
      longitude: lng,
      placeId: city ? `local:city:${city.id}` : null,
      confidence: verdict === 'verified' ? 0.85 : 0.7,
      provider: this.name,
    };
    return { verdict, normalized, confidence: normalized.confidence, changes, provider: this.name };
  }

  async autocomplete(query: ForwardQuery): Promise<PlaceCandidate[]> {
    const q = String(query.query ?? '').trim();
    if (!q) return [];
    const limit = clampLimit(query.limit);
    const prefix = `${q}%`;
    const cities = await City.findAll({
      where: { [Op.or]: [{ name: { [Op.iLike]: prefix } }, { nameAscii: { [Op.iLike]: prefix } }] },
      order: [['population', 'DESC NULLS LAST'] as unknown as [string, string]],
      limit,
    });
    return Promise.all(cities.map((c) => cityToLocation(c)));
  }
}

// ─── Mapping + geo helpers ──────────────────────────────────────────────────────

function addressToLocation(a: InstanceType<typeof Address>): NormalizedLocation {
  const meta = (a.metadata && typeof a.metadata === 'object' ? a.metadata : {}) as Record<string, unknown>;
  const confidence = typeof meta.confidence === 'number' ? meta.confidence : 0.8;
  return {
    formattedAddress: a.formattedAddress ?? null,
    line1: a.line1 ?? null,
    line2: a.line2 ?? null,
    city: a.cityName ?? null,
    state: a.stateName ?? null,
    postalCode: a.postalCode ?? null,
    countryCode: a.countryCode ?? null,
    latitude: num(a.latitude),
    longitude: num(a.longitude),
    placeId: a.placeId ?? `local:address:${a.id}`,
    confidence,
    provider: 'local',
  };
}

async function cityToLocation(c: InstanceType<typeof City>): Promise<NormalizedLocation> {
  // Resolve the parent country/state codes for a complete coarse candidate.
  const country = c.countryId ? await Country.findByPk(c.countryId) : null;
  const state = c.stateProvinceId ? await StateProvince.findByPk(c.stateProvinceId) : null;
  return {
    formattedAddress: [c.name, state?.name, country?.iso2].filter(Boolean).join(', ') || c.name,
    line1: null,
    line2: null,
    city: c.name,
    state: state?.name ?? null,
    postalCode: null,
    countryCode: country?.iso2 ?? null,
    latitude: num(c.latitude),
    longitude: num(c.longitude),
    placeId: `local:city:${c.id}`,
    confidence: 0.5,
    provider: 'local',
  };
}

/** A degree-window WHERE clause around a point (coarse btree prefilter before Haversine). */
function boundingBox(q: ReverseQuery, delta: number): Record<string, unknown> {
  return {
    latitude: { [Op.between]: [q.latitude - delta, q.latitude + delta] },
    longitude: { [Op.between]: [q.longitude - delta, q.longitude + delta] },
  };
}

// Distance caps for reverse-geocode matches (km). A street address must be ~on the
// point; a city centroid may sit further out but still near. Beyond these the local
// hit is rejected so the orchestrator falls through to a remote geocoder.
const ADDRESS_MATCH_KM = 2;
const CITY_MATCH_KM = 50;

/** Pick the row with the smallest Haversine distance to the query point, rejecting
 *  any match beyond `maxKm` (so a far "nearest" row never wins). */
function nearest<T extends { latitude: unknown; longitude: unknown }>(
  rows: T[],
  q: ReverseQuery,
  maxKm = Infinity,
): T | null {
  let best: T | null = null;
  let bestKm = Infinity;
  for (const row of rows) {
    const lat = num(row.latitude);
    const lng = num(row.longitude);
    if (lat === null || lng === null) continue;
    const km = haversineKm(q.latitude, q.longitude, lat, lng);
    if (km < bestKm) {
      bestKm = km;
      best = row;
    }
  }
  return best !== null && bestKm <= maxKm ? best : null;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function equalsLoose(a: string | undefined | null, b: string | undefined | null): boolean {
  return String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
}

function clampLimit(limit: number | undefined): number {
  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0) return 5;
  return Math.min(Math.floor(n), 10);
}
