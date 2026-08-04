import { GeocodeProvider } from './GeocodeProvider';
import { GoogleGeocodeProvider } from './GoogleGeocodeProvider';
import { NominatimGeocodeProvider } from './NominatimGeocodeProvider';

/**
 * Default provider priority order (the **strategy**): the premium Google adapter
 * wins when `GOOGLE_MAPS_API_KEY` is configured, otherwise fall back to the
 * always-on open-source Nominatim adapter. Higher priority first.
 *
 * Both implement `GeocodeProvider` and return the identical `NormalizedLocation`
 * shape, so swapping between the free and premium engine is purely a config change.
 * Mirrors `connectors/ocr/selectOcrProvider.ts`.
 */
export function defaultGeocodeProviders(env: NodeJS.ProcessEnv = process.env): GeocodeProvider[] {
  return [new GoogleGeocodeProvider(env), new NominatimGeocodeProvider(env)];
}

/**
 * Pick the first available provider from the priority list. Throws if none can run
 * (the open-source provider is always available, so this only happens with a custom
 * list). Pass a custom list (e.g. in tests) to override the default strategy.
 */
export function selectGeocodeProvider(providers: GeocodeProvider[] = defaultGeocodeProviders()): GeocodeProvider {
  const provider = providers.find((candidate) => candidate.isAvailable());
  if (!provider) {
    throw new Error('No geocoding provider is available');
  }
  return provider;
}
