import { toDomain, looksLikeAddress, localScrubSignals, loadThirdPartySignals } from './scrub';

describe('toDomain', () => {
  test.each([
    ['', null],
    ['   ', null],
    ['https://www.ACME.com/contact', 'acme.com'],
    ['http://foo.bar.co.uk/x?y=1', 'foo.bar.co.uk'],
    ['not a domain', null],
    ['nodot', null],
    ['foo.invalid', 'foo.invalid'],
  ])('toDomain(%p) -> %p', (input, expected) => {
    expect(toDomain(input)).toBe(expected);
  });
});

describe('looksLikeAddress', () => {
  test.each([
    [null, false],
    ['short', false],
    ['12 Main Street', true],
    ['Flat A, Tower', true],
    ['abcdefghij', false],
  ])('looksLikeAddress(%p) -> %p', (input, expected) => {
    expect(looksLikeAddress(input as string | null)).toBe(expected);
  });
});

describe('localScrubSignals', () => {
  test('secure domain + valid address', () => {
    const s = localScrubSignals('12 Main Street, Town', 'acme.com');
    expect(s).toMatchObject({ addressValid: true, domainSecure: true, provider: 'local-heuristics' });
  });
  test('insecure / invalid domains are not secure', () => {
    expect(localScrubSignals(null, 'x.invalid').domainSecure).toBe(false);
    expect(localScrubSignals(null, 'insecure-host.com').domainSecure).toBe(false);
    expect(localScrubSignals(null, null).domainSecure).toBe(false);
  });
});

describe('loadThirdPartySignals', () => {
  const ORIGINAL = process.env.RISK_ENRICHMENT_API_URL;
  let fetchSpy: jest.SpyInstance;

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.RISK_ENRICHMENT_API_URL;
    else process.env.RISK_ENRICHMENT_API_URL = ORIGINAL;
    if (fetchSpy) fetchSpy.mockRestore();
  });

  test('no API configured -> local fallback, no network', async () => {
    delete process.env.RISK_ENRICHMENT_API_URL;
    fetchSpy = jest.spyOn(global, 'fetch' as any);
    const s = await loadThirdPartySignals('12 Main Street, Town', 'acme.com');
    expect(s.provider).toBe('local-heuristics');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('API ok -> maps the response', async () => {
    process.env.RISK_ENRICHMENT_API_URL = 'https://risk.example/scrub';
    fetchSpy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: async () => ({ addressValid: true, domainSecure: false, provider: 'vendor-x' }),
    } as any);
    const s = await loadThirdPartySignals('x', 'acme.com');
    expect(s).toMatchObject({ addressValid: true, domainSecure: false, provider: 'vendor-x' });
  });

  test('API ok but sparse body -> defaults provider, falls back per field', async () => {
    process.env.RISK_ENRICHMENT_API_URL = 'https://risk.example/scrub';
    fetchSpy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({}) } as any);
    const s = await loadThirdPartySignals('12 Main Street, Town', 'acme.com');
    expect(s.provider).toBe('third-party-risk-api');
    expect(s.addressValid).toBe(true); // from local fallback
  });

  test('API non-2xx -> local fallback', async () => {
    process.env.RISK_ENRICHMENT_API_URL = 'https://risk.example/scrub';
    fetchSpy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: false, json: async () => ({}) } as any);
    const s = await loadThirdPartySignals('12 Main Street, Town', 'acme.com');
    expect(s.provider).toBe('local-heuristics');
  });

  test('API throws -> local fallback', async () => {
    process.env.RISK_ENRICHMENT_API_URL = 'https://risk.example/scrub';
    fetchSpy = jest.spyOn(global, 'fetch' as any).mockRejectedValue(new Error('network'));
    const s = await loadThirdPartySignals('12 Main Street, Town', 'acme.com');
    expect(s.provider).toBe('local-heuristics');
  });
});
