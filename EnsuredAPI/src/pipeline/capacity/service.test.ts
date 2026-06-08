import { createPipelineTransformationReporter } from '../../../test/helpers/pipelineTransformations';
import { CapacityMatchService } from './service';

describe('CapacityMatchService', () => {
  const transformations = createPipelineTransformationReporter('capacity');

  afterAll(async () => {
    await transformations.write();
  });

  test('routes in-appetite A/B risks to priority queue when capacity is available', async () => {
    const svc = new CapacityMatchService();
    const payload = {
      extraction: { structuredData: { riskType: 'wind', limit: 10_000_000, expectedYield: 0.1 } },
      preRating: { grade: 'A', expectedYield: 0.1 },
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
  });

  test('routes out-of-appetite risks to partner pool', async () => {
    const svc = new CapacityMatchService();
    const payload = {
      extraction: { structuredData: { riskType: 'cyber', limit: 50_000_000, expectedYield: 0.08 } },
      preRating: { grade: 'B' },
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
  });
});
