jest.mock('../../db/models', () => ({
  CapacityLocationLimit: { findAll: jest.fn() },
  InsurerProfile: { findAll: jest.fn() },
  Policy: { sum: jest.fn() },
}));

import { CapacityLocationLimit } from '../../db/models';
import { LocationCapacityService, type BoundExposureLoader } from './locationUtilizationService';

const limit = (over: Partial<any> = {}): any => ({
  entry: 'US/Florida',
  level: 'state',
  lineOfBusinessCode: '*',
  currency: 'USD',
  aggregateLimit: '50000000',
  maxLineSize: '5000000',
  countryId: 1,
  stateProvinceId: 10,
  cityId: null,
  enabled: true,
  ...over,
});

const findAllMock = CapacityLocationLimit.findAll as jest.Mock;
beforeEach(() => jest.clearAllMocks());

describe('LocationCapacityService.computeUtilization', () => {
  it('computes utilization% = deployed ÷ aggregate cap (rounded)', async () => {
    findAllMock.mockResolvedValue([limit()]);
    const loadBound: BoundExposureLoader = async () => 48_000_000;
    const { regions, warnings } = await new LocationCapacityService({ loadBound }).computeUtilization(1);

    expect(regions).toHaveLength(1);
    expect(regions[0]).toMatchObject({
      entry: 'US/Florida',
      aggregateLimit: 50_000_000,
      boundExposure: 48_000_000,
      inFlightExposure: 0,
      deployed: 48_000_000,
      utilizationPct: 96,
    });
    expect(warnings.join(' ')).toMatch(/in-flight exposure unavailable/);
  });

  it('null utilization when a limit has no aggregate cap', async () => {
    findAllMock.mockResolvedValue([limit({ aggregateLimit: null })]);
    const { regions, warnings } = await new LocationCapacityService({ loadBound: async () => 1000 }).computeUtilization(1);
    expect(regions[0].utilizationPct).toBeNull();
    expect(warnings).toHaveLength(0);
  });

  it('filters by LOB — a specific-LOB limit is excluded for a different LOB, "*" always applies', async () => {
    findAllMock.mockResolvedValue([
      limit({ entry: 'US/Florida', lineOfBusinessCode: 'PROP' }),
      limit({ entry: 'US/Texas', lineOfBusinessCode: '*' }),
      limit({ entry: 'US/Georgia', lineOfBusinessCode: 'CASUALTY' }),
    ]);
    const { regions } = await new LocationCapacityService({ loadBound: async () => 0 }).computeUtilization(1, {
      lineOfBusinessCode: 'PROP',
    });
    expect(regions.map((r) => r.entry).sort()).toEqual(['US/Florida', 'US/Texas']);
  });

  it('passes the limit region + LOB to the exposure loader', async () => {
    findAllMock.mockResolvedValue([limit({ lineOfBusinessCode: 'PROP', stateProvinceId: 10 })]);
    const seen: any[] = [];
    const loadBound: BoundExposureLoader = async (args) => {
      seen.push(args);
      return 0;
    };
    await new LocationCapacityService({ loadBound }).computeUtilization(7);
    expect(seen[0]).toMatchObject({ organizationId: 7, level: 'state', stateProvinceId: 10, lineOfBusinessCode: 'PROP' });
  });
});
