import { selectSanctionsProvider, defaultSanctionsProviders } from './selectSanctionsProvider';
import { SanctionsProvider } from './SanctionsProvider';

function fakeProvider(name: string, available: boolean): SanctionsProvider {
  return {
    name,
    isAvailable: () => available,
    screen: async () => ({ result: 'clear', listVersion: 'n/a', matches: [], provider: name }),
  };
}

describe('selectSanctionsProvider (strategy)', () => {
  it('prefers the real OFAC API provider when SANCTIONS_API_URL/KEY are configured', () => {
    const providers = defaultSanctionsProviders({
      SANCTIONS_API_URL: 'https://screen.example',
      SANCTIONS_API_KEY: 'k',
    } as NodeJS.ProcessEnv);
    expect(selectSanctionsProvider(providers).name).toBe('ofac-api');
  });

  it('falls back to the simulated provider when no API config is present', () => {
    const providers = defaultSanctionsProviders({} as NodeJS.ProcessEnv);
    expect(selectSanctionsProvider(providers).name).toBe('simulated');
  });

  it('picks the first available provider in priority order', () => {
    const selected = selectSanctionsProvider([
      fakeProvider('a', false),
      fakeProvider('b', true),
      fakeProvider('c', true),
    ]);
    expect(selected.name).toBe('b');
  });

  it('throws when no provider is available', () => {
    expect(() => selectSanctionsProvider([fakeProvider('a', false)])).toThrow(/No sanctions provider is available/);
  });
});
