import type { GeolocationProvider } from './GeolocationProvider';
import { LocalDatasetProvider } from './LocalDatasetProvider';
import { GoogleGeolocationProvider } from './GoogleGeolocationProvider';
import { MapboxGeolocationProvider } from './MapboxGeolocationProvider';
import { NominatimGeolocationProvider } from './NominatimGeolocationProvider';

/**
 * The ordered geolocation provider chain — **local first**, then premium engines,
 * then the always-on free fallback:
 *
 *   1. LocalDatasetProvider  — our own DB; zero network; tried first for every method.
 *   2. GoogleGeolocationProvider  — available only with GOOGLE_MAPS_API_KEY.
 *   3. MapboxGeolocationProvider  — available only with MAPBOX_ACCESS_TOKEN.
 *   4. NominatimGeolocationProvider — always available (open-source fallback).
 *
 * Unlike `selectGeocodeProvider` (which picks ONE), this returns the full list:
 * the orchestrator (`pipeline/geolocation/service.ts`) chooses per method by
 * capability + availability, so e.g. a `verify` request skips Mapbox/Nominatim
 * (no verify capability) and lands on Google, while a `shape` request skips Google
 * and lands on Nominatim. Mirrors the shape of `defaultGeocodeProviders`.
 */
export function defaultGeolocationProviders(env: NodeJS.ProcessEnv = process.env): GeolocationProvider[] {
  return [
    new LocalDatasetProvider(),
    new GoogleGeolocationProvider(env),
    new MapboxGeolocationProvider(env),
    new NominatimGeolocationProvider(env),
  ];
}
