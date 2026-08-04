// Mock DB models so the stage's persistence + geography resolution run without a database.
jest.mock('../../../db/models', () => ({
  SubmissionOutput: { findOne: jest.fn(), create: jest.fn() },
  EnrichmentData: { create: jest.fn() },
  Address: { findOne: jest.fn(), create: jest.fn() },
  Country: { findOne: jest.fn() },
  StateProvince: { findOne: jest.fn() },
  City: { findOne: jest.fn() },
}));

import { Address, Country, EnrichmentData, StateProvince, City, SubmissionOutput } from '../../../db/models';
import { LocationDiscoveryService } from './service';
import type { GeocodeProvider, NormalizedLocation } from '../connectors/geocoding/GeocodeProvider';

const docFindOne = SubmissionOutput.findOne as unknown as jest.Mock;
const docCreate = SubmissionOutput.create as unknown as jest.Mock;
const enrichmentCreate = EnrichmentData.create as unknown as jest.Mock;
const addressFindOne = Address.findOne as unknown as jest.Mock;
const addressCreate = Address.create as unknown as jest.Mock;

function loc(over: Partial<NormalizedLocation> = {}): NormalizedLocation {
  return {
    formattedAddress: '100 Bay St, Tampa, FL 33602, USA',
    line1: '100 Bay St',
    line2: null,
    city: 'Tampa',
    state: 'Florida',
    postalCode: '33602',
    countryCode: 'US',
    latitude: 27.9506,
    longitude: -82.4572,
    placeId: 'place-1',
    confidence: 0.9,
    provider: 'fake',
    ...over,
  };
}

/** A provider that returns a fixed result and records every query it received. */
function fakeProvider(impl: (q: string) => Promise<NormalizedLocation | null>): GeocodeProvider & { calls: string[] } {
  const calls: string[] = [];
  return {
    name: 'fake',
    calls,
    isAvailable: () => true,
    geocode: async ({ query }) => {
      calls.push(query);
      return impl(query);
    },
  };
}

beforeEach(() => {
  docFindOne.mockReset().mockResolvedValue(null);
  docCreate.mockReset().mockImplementation(async () => ({ id: 7, structuredData: null, save: jest.fn() }));
  enrichmentCreate.mockReset().mockResolvedValue({});
  addressFindOne.mockReset().mockResolvedValue(null);
  addressCreate.mockReset().mockImplementation(async () => ({ id: 42 }));
  (Country.findOne as unknown as jest.Mock).mockReset().mockResolvedValue(null);
  (StateProvince.findOne as unknown as jest.Mock).mockReset().mockResolvedValue(null);
  (City.findOne as unknown as jest.Mock).mockReset().mockResolvedValue(null);
});

describe('LocationDiscoveryService', () => {
  it('geocodes each insured subject and applies the normalized location (no DB when no submission)', async () => {
    const provider = fakeProvider(async () => loc());
    const res: any = await new LocationDiscoveryService({ provider }).process({
      extraction: { structuredData: { subjects: [{ label: 'Warehouse #3', location: '100 Bay St, Tampa FL' }] } },
    });

    expect(res.ok).toBe(true);
    expect(res.provider).toBe('fake');
    expect(res.resolved).toBe(1);
    expect(res.unresolved).toBe(0);
    expect(res.subjects[0]).toMatchObject({
      latitude: 27.9506,
      longitude: -82.4572,
      normalizedLocation: expect.objectContaining({ city: 'Tampa', countryCode: 'US' }),
    });
    // No submission id → pure geocode, no persistence.
    expect(docFindOne).not.toHaveBeenCalled();
    expect(addressCreate).not.toHaveBeenCalled();
  });

  it('geocodes a distinct address only once across repeated subjects', async () => {
    const provider = fakeProvider(async () => loc());
    await new LocationDiscoveryService({ provider }).process({
      extraction: {
        structuredData: {
          subjects: [
            { label: 'A', location: '100 Bay St, Tampa FL' },
            { label: 'B', location: '100 Bay St, Tampa FL' },
            { label: 'C', location: '200 Other Rd, Tampa FL' },
          ],
        },
      },
    });
    expect(provider.calls).toEqual(['100 Bay St, Tampa FL', '200 Other Rd, Tampa FL']);
  });

  it('records a warning and leaves the subject un-geocoded when the provider throws', async () => {
    const provider = fakeProvider(async () => {
      throw new Error('rate limited');
    });
    const res: any = await new LocationDiscoveryService({ provider }).process({
      extraction: { structuredData: { subjects: [{ label: 'X', location: 'somewhere' }] } },
    });
    expect(res.resolved).toBe(0);
    expect(res.unresolved).toBe(1);
    expect(res.subjects[0].latitude).toBeUndefined();
    expect(res.warnings[0]).toMatch(/Geocoding failed for "X": rate limited/);
  });

  it('falls back to the submission-level propertyLocation when no subject carries a location', async () => {
    const provider = fakeProvider(async () => loc());
    const res: any = await new LocationDiscoveryService({ provider }).process({
      extraction: { structuredData: { subjects: [], propertyLocation: '1 Risk Plaza, Tampa FL' } },
    });
    expect(provider.calls).toEqual(['1 Risk Plaza, Tampa FL']);
    expect(res.resolved).toBe(1);
    expect(res.subjects).toHaveLength(1);
    expect(res.subjects[0].normalizedLocation.city).toBe('Tampa');
  });

  it('persists results (SubmissionOutput + EnrichmentData + Address) when a submission id is present', async () => {
    const provider = fakeProvider(async () => loc());
    const save = jest.fn();
    docFindOne.mockResolvedValue({ id: 9, structuredData: { extraction: { subjects: [] } }, save });

    const res: any = await new LocationDiscoveryService({ provider }).process({
      submission: { id: 100, organizationId: 3 },
      extraction: { structuredData: { subjects: [{ label: 'Warehouse', location: '100 Bay St' }] } },
    });

    expect(res.ok).toBe(true);
    expect(res.locations[0].addressId).toBe(42);
    expect(addressCreate).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(enrichmentCreate).toHaveBeenCalledWith(expect.objectContaining({ submissionId: 100, enrichmentType: 'location' }));
  });

  it('returns ok with no work when there are no locations to discover', async () => {
    const provider = fakeProvider(async () => loc());
    const res: any = await new LocationDiscoveryService({ provider }).process({
      extraction: { structuredData: { subjects: [{ label: 'No address subject' }] } },
    });
    expect(res.ok).toBe(true);
    expect(res.total).toBe(0);
    expect(provider.calls).toEqual([]);
    expect(res.warnings).toContain('No insured-subject locations found to discover');
  });
});
