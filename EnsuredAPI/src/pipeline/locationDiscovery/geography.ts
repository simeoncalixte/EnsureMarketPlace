/**
 * DB-side resolution for the location-discovery stage: take a provider-agnostic
 * `NormalizedLocation` and attach it to the normalized geography hierarchy
 * (Continent → Country → StateProvince → City) plus the reusable `Address` book.
 *
 * GRACEFUL BY DESIGN — mirrors the catastrophe service: every lookup is best-effort
 * and the whole resolution is wrapped so that an empty/unloaded geography table or
 * any DB error degrades to "ids left null" rather than failing the pipeline stage.
 * A geocode result is still useful (lat/lng + denormalized city/state/country text)
 * even when the reference hierarchy has nothing to join against.
 *
 * The `Address` row is the canonical attach point — it already carries `placeId`,
 * `formattedAddress`, lat/lng and FKs into the hierarchy — so we upsert one keyed by
 * the provider `placeId` (or the formatted string when no placeId) to dedupe repeat
 * geocodes across submissions.
 */
import { Op } from 'sequelize';
import { Address, City, Country, StateProvince } from '../../db/models';
import type { NormalizedLocation } from '../connectors/geocoding/GeocodeProvider';

export type ResolvedGeography = {
  addressId: number | null;
  countryId: number | null;
  stateProvinceId: number | null;
  cityId: number | null;
};

const EMPTY: ResolvedGeography = { addressId: null, countryId: null, stateProvinceId: null, cityId: null };

/**
 * Resolve hierarchy ids for a normalized location and upsert an Address row.
 * Never throws — any failure yields `EMPTY` (all ids null), keeping the stage's
 * "enhance, never degrade" contract.
 */
export async function resolveAndPersistGeography(
  location: NormalizedLocation,
  organizationId: number | null,
): Promise<ResolvedGeography> {
  try {
    const countryId = await resolveCountryId(location.countryCode);
    const stateProvinceId = await resolveStateProvinceId(countryId, location.state);
    const cityId = await resolveCityId(countryId, stateProvinceId, location.city);
    const addressId = await upsertAddress(location, { countryId, stateProvinceId, cityId });
    return { addressId, countryId, stateProvinceId, cityId };
  } catch {
    // Geography tables may be unmigrated/empty in some environments — degrade.
    return { ...EMPTY };
  }
}

export async function resolveCountryId(countryCode: string | null): Promise<number | null> {
  if (!countryCode) return null;
  const country = await Country.findOne({
    where: { iso2: countryCode.toUpperCase() },
    attributes: ['id'],
  });
  return country?.id ?? null;
}

export async function resolveStateProvinceId(countryId: number | null, state: string | null): Promise<number | null> {
  if (!countryId || !state) return null;
  const trimmed = state.trim();
  const sp = await StateProvince.findOne({
    where: {
      countryId,
      [Op.or]: [
        { name: { [Op.iLike]: trimmed } },
        { nameAscii: { [Op.iLike]: trimmed } },
        { code: { [Op.iLike]: trimmed } },
      ],
    },
    attributes: ['id'],
  });
  return sp?.id ?? null;
}

export async function resolveCityId(
  countryId: number | null,
  stateProvinceId: number | null,
  city: string | null,
): Promise<number | null> {
  if (!countryId || !city) return null;
  const trimmed = city.trim();
  const where: Record<string, unknown> = {
    countryId,
    [Op.or]: [{ name: { [Op.iLike]: trimmed } }, { nameAscii: { [Op.iLike]: trimmed } }],
  };
  if (stateProvinceId) where.stateProvinceId = stateProvinceId;
  // When several cities share a name, prefer the largest (population desc).
  const cityRow = await City.findOne({
    where,
    attributes: ['id'],
    order: [['population', 'DESC NULLS LAST'] as unknown as [string, string]],
  });
  return cityRow?.id ?? null;
}

/**
 * Upsert the Address book row for this location. Dedupe key is `placeId` when the
 * provider supplies one, else the `formattedAddress` text. Existing rows are
 * enriched (never blanked) so a later, higher-confidence geocode can fill gaps.
 */
export async function upsertAddress(
  location: NormalizedLocation,
  ids: { countryId: number | null; stateProvinceId: number | null; cityId: number | null },
): Promise<number | null> {
  const metadata: Record<string, unknown> = { provider: location.provider, confidence: location.confidence };

  const dedupeWhere = location.placeId
    ? { placeId: location.placeId }
    : location.formattedAddress
      ? { formattedAddress: location.formattedAddress }
      : null;

  if (dedupeWhere) {
    const existing = await Address.findOne({ where: dedupeWhere });
    if (existing) {
      // Enrich-only: keep any previously-resolved value when this result lacks it.
      existing.line1 = location.line1 ?? existing.line1;
      existing.line2 = location.line2 ?? existing.line2;
      existing.cityId = ids.cityId ?? existing.cityId;
      existing.stateProvinceId = ids.stateProvinceId ?? existing.stateProvinceId;
      existing.countryId = ids.countryId ?? existing.countryId;
      existing.cityName = location.city ?? existing.cityName;
      existing.stateName = location.state ?? existing.stateName;
      existing.countryCode = location.countryCode ?? existing.countryCode;
      existing.postalCode = location.postalCode ?? existing.postalCode;
      existing.latitude = location.latitude ?? existing.latitude;
      existing.longitude = location.longitude ?? existing.longitude;
      existing.formattedAddress = location.formattedAddress ?? existing.formattedAddress;
      existing.metadata = metadata;
      await existing.save();
      return existing.id;
    }
  }

  const created = await Address.create({
    line1: location.line1,
    line2: location.line2,
    cityId: ids.cityId,
    stateProvinceId: ids.stateProvinceId,
    countryId: ids.countryId,
    cityName: location.city,
    stateName: location.state,
    countryCode: location.countryCode,
    postalCode: location.postalCode,
    latitude: location.latitude,
    longitude: location.longitude,
    formattedAddress: location.formattedAddress,
    placeId: location.placeId,
    metadata,
  });
  return created.id;
}
