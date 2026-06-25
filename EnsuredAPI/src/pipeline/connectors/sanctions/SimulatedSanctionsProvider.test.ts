import { SimulatedSanctionsProvider } from './SimulatedSanctionsProvider';

describe('SimulatedSanctionsProvider', () => {
  const provider = new SimulatedSanctionsProvider();

  it('is always available', () => {
    expect(provider.isAvailable()).toBe(true);
  });

  it('clears an ordinary party name', async () => {
    const out = await provider.screen({ name: 'Northwind Specialty Insurance' });
    expect(out.result).toBe('clear');
    expect(out.matches).toHaveLength(0);
    expect(out.provider).toBe('simulated');
    expect(out.listVersion).toMatch(/^OFAC-SDN-SIM-\d{4}-\d{2}-\d{2}$/);
  });

  it('flags a blocked entity as a hit (case-insensitive, substring)', async () => {
    const out = await provider.screen({ name: 'Acme c/o Black Mamba Holdings Ltd' });
    expect(out.result).toBe('hit');
    expect(out.matches[0].score).toBe(1);
    expect(out.matches[0].listName).toContain('OFAC SDN');
  });

  it('flags a watchlist token as a potential match for human review', async () => {
    const out = await provider.screen({ name: 'Global Shell Trading Group' });
    expect(out.result).toBe('potential_match');
    expect(out.matches[0].score).toBeLessThan(1);
  });

  it('treats an empty name as clear', async () => {
    const out = await provider.screen({ name: '   ' });
    expect(out.result).toBe('clear');
  });

  it('is deterministic for the same name', async () => {
    const a = await provider.screen({ name: 'Crimson Syndicate' });
    const b = await provider.screen({ name: 'crimson syndicate' });
    expect(a.result).toBe('hit');
    expect(b.result).toBe('hit');
  });
});
