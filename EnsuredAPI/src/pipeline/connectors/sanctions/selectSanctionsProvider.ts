import { SanctionsProvider } from './SanctionsProvider';
import { OfacApiSanctionsProvider } from './OfacApiSanctionsProvider';
import { SimulatedSanctionsProvider } from './SimulatedSanctionsProvider';

/**
 * Default provider priority order (the **strategy**): the real commercial API
 * adapter wins when `SANCTIONS_API_URL`/`SANCTIONS_API_KEY` are configured,
 * otherwise fall back to the always-on simulated adapter. Higher priority first.
 *
 * Both implement `SanctionsProvider` and return the identical
 * `SanctionsScreenOutcome` shape, so swapping between the simulated and real
 * engine is purely a config change. Mirrors `connectors/geocoding/
 * selectGeocodeProvider.ts`.
 */
export function defaultSanctionsProviders(env: NodeJS.ProcessEnv = process.env): SanctionsProvider[] {
  return [new OfacApiSanctionsProvider(env), new SimulatedSanctionsProvider()];
}

/**
 * Pick the first available provider from the priority list. Throws if none can run
 * (the simulated provider is always available, so this only happens with a custom
 * list). Pass a custom list (e.g. in tests) to override the default strategy.
 */
export function selectSanctionsProvider(
  providers: SanctionsProvider[] = defaultSanctionsProviders(),
): SanctionsProvider {
  const provider = providers.find((candidate) => candidate.isAvailable());
  if (!provider) {
    throw new Error('No sanctions provider is available');
  }
  return provider;
}
