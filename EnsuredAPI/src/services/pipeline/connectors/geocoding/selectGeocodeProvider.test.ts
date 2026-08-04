import { selectGeocodeProvider, defaultGeocodeProviders } from './selectGeocodeProvider';
import { GeocodeProvider } from './GeocodeProvider';

function fakeProvider(name: string, available: boolean): GeocodeProvider {
  return { name, isAvailable: () => available, geocode: async () => null };
}

describe('selectGeocodeProvider (strategy)', () => {
  it('prefers the premium Google provider when GOOGLE_MAPS_API_KEY is configured', () => {
    const providers = defaultGeocodeProviders({ GOOGLE_MAPS_API_KEY: 'k' } as NodeJS.ProcessEnv);
    expect(selectGeocodeProvider(providers).name).toBe('google');
  });

  it('falls back to the open-source Nominatim provider when no Google key is configured', () => {
    const providers = defaultGeocodeProviders({} as NodeJS.ProcessEnv);
    expect(selectGeocodeProvider(providers).name).toBe('nominatim');
  });

  it('picks the first available provider in priority order', () => {
    const selected = selectGeocodeProvider([fakeProvider('a', false), fakeProvider('b', true), fakeProvider('c', true)]);
    expect(selected.name).toBe('b');
  });

  it('throws when no provider is available', () => {
    expect(() => selectGeocodeProvider([fakeProvider('a', false)])).toThrow(/No geocoding provider is available/);
  });
});
