import { createPipelineTransformationReporter } from '../../../test/helpers/pipelineTransformations';
import { CapacityMatchService, CapacityByPerilLoader } from './service';

// Inject the per-peril capacity so the stage is unit-testable without a DB.
// Single source of truth in production = OrganizationAppetiteProfile.capacityByPeril.
const caps = (m: Record<string, number>): { loadCapacityByPeril: CapacityByPerilLoader } => ({
  loadCapacityByPeril: async () => m,
});

describe('CapacityMatchService', () => {
  const transformations = createPipelineTransformationReporter('capacity');

  afterAll(async () => {
    await transformations.write();
  });

  test('routes in-appetite A/B risks to priority queue when capacity is available', async () => {
    const svc = new CapacityMatchService(caps({ wind: 125_000_000 }));
    const payload = {
      extraction: { structuredData: { riskType: 'wind', limit: 10_000_000, expectedYield: 0.1 } },
      preRating: { grade: 'A', expectedYield: 0.1 },
      // Appetite decision is owned by validation and consumed here.
      validation: { appetite: { decision: 'IN_APPETITE' } },
    };
    const result = await svc.process(payload);

    transformations.record({
      stage: 'capacity-match',
      testName: 'routes in-appetite A/B risks to priority queue when capacity is available',
      description: 'Rated in-appetite risk is transformed into a priority queue capacity decision.',
      before: payload,
      after: result,
    });

    expect(result.ok).toBe(true);
    expect(result.route).toBe('priority_queue');
    expect(result.hasCapacity).toBe(true);
    expect(result.riskCapacity).toBe(125_000_000);
  });

  test('routes out-of-appetite risks to partner pool (real appetite decision, not a hardcoded list)', async () => {
    // Earthquake is in NO hardcoded list — routing now reflects the org's real decision.
    const svc = new CapacityMatchService(caps({ earthquake: 200_000_000 }));
    const payload = {
      extraction: { structuredData: { riskType: 'earthquake', limit: 50_000_000, expectedYield: 0.08 } },
      preRating: { grade: 'B' },
      validation: { appetite: { decision: 'OUT_OF_APPETITE' } },
    };
    const result = await svc.process(payload);

    transformations.record({
      stage: 'capacity-match',
      testName: 'routes out-of-appetite risks to partner pool',
      description: 'Out-of-appetite risk is transformed into a partner-pool routing decision.',
      before: payload,
      after: result,
    });

    expect(result.route).toBe('partner_pool');
    expect(result.destinationPool).toBe('external-partner');
    expect(result.inAppetite).toBe(false);
  });

  test('in-appetite but over the configured per-peril capacity -> partner overflow', async () => {
    const svc = new CapacityMatchService(caps({ wind: 125_000_000 }));
    const result = await svc.process({
      extraction: { structuredData: { riskType: 'wind', limit: 200_000_000 } },
      preRating: { grade: 'A' },
      validation: { appetite: { decision: 'IN_APPETITE' } },
    });
    expect(result.hasCapacity).toBe(false);
    expect(result.route).toBe('partner_pool');
    expect(result.destinationPool).toBe('overflow');
  });

  test('non-degradation: no appetite decision / unconfigured capacity does not block', async () => {
    const svc = new CapacityMatchService(caps({})); // no configured caps
    const result = await svc.process({
      extraction: { structuredData: { riskType: 'wind', limit: 10_000_000 } },
      preRating: { grade: 'A' },
      // no validation block at all
    });
    expect(result.inAppetite).toBe(true); // missing decision must not block
    expect(result.hasCapacity).toBe(true); // unconfigured peril must not fabricate a shortfall
    expect(result.route).toBe('priority_queue');
    expect(result.flags).toEqual(
      expect.arrayContaining(['appetite:no_decision_defaulted_in', 'capacity:unconfigured_for_peril']),
    );
  });
});
