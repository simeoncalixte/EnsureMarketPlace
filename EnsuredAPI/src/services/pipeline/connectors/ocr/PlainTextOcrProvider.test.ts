import { PlainTextOcrProvider } from './PlainTextOcrProvider';

describe('PlainTextOcrProvider (adapter)', () => {
  it('is always available (dependency-free)', () => {
    expect(new PlainTextOcrProvider().isAvailable()).toBe(true);
  });

  it('decodes UTF-8 text buffers as extracted text', async () => {
    const provider = new PlainTextOcrProvider();
    const text = 'ACORD 125 — Named Insured: Acme LLC\nPremium: $2,500,000';
    const result = await provider.recognize({ buffer: Buffer.from(text, 'utf8') });
    expect(result.provider).toBe('plain-text');
    expect(result.text).toBe(text);
  });

  it('refuses binary input (NUL byte) instead of returning garbage', async () => {
    const provider = new PlainTextOcrProvider();
    const binary = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x00, 0x01, 0x02, 0x03]); // "%PDF" + NUL…
    await expect(provider.recognize({ buffer: binary })).rejects.toThrow(/not UTF-8 text/);
  });
});
