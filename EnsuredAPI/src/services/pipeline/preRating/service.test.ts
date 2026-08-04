import { createPipelineTransformationReporter } from '../../../../test/helpers/pipelineTransformations';
import { PreRatingService } from './service';

describe('PreRatingService', () => {
  const transformations = createPipelineTransformationReporter('preRating');

  afterAll(async () => {
    await transformations.write();
  });

  test('assigns strong grade for in-appetite validated risks', async () => {
    const svc = new PreRatingService();
    const payload = {
      normalization: { normalized: { riskType: 'wind', expectedYield: 0.11 } },
      // Appetite decision is owned by the validation stage and consumed here.
      validation: { flaggedForMoreInfo: false, appetite: { decision: 'IN_APPETITE', reasons: [] } },
    };
    const result = await svc.process(payload);

    transformations.record({
      stage: 'pre-rating',
      testName: 'assigns strong grade for in-appetite validated risks',
      description: 'Validated in-appetite risk data is transformed into a strong pre-rating grade.',
      before: payload,
      after: result,
    });

    expect(result.ok).toBe(true);
    expect(result.grade === 'A' || result.grade === 'B').toBe(true);
    expect(result.numericScore).toBeGreaterThanOrEqual(75);
  });

  test('downgrades grade when validation fails', async () => {
    const svc = new PreRatingService();
    const payload = {
      extraction: { structuredData: { riskType: 'wind', expectedYield: 0.1 } },
      validation: { flaggedForMoreInfo: true },
    };
    const result = await svc.process(payload);

    transformations.record({
      stage: 'pre-rating',
      testName: 'downgrades grade when validation fails',
      description: 'A validation failure is transformed into a lower score and grade.',
      before: payload,
      after: result,
    });

    expect(result.ok).toBe(true);
    expect(Number(result.numericScore)).toBeLessThan(70);
  });

  test('penalizes out-of-appetite risks using the real appetite decision', async () => {
    const svc = new PreRatingService();
    // Earthquake is NOT in any hardcoded list — the grade now reflects the org's
    // configured appetite decision (proving preRating consumes it, not a peril list).
    const inAppetite = await svc.process({
      normalization: { normalized: { riskType: 'earthquake', expectedYield: 0.11 } },
      validation: { flaggedForMoreInfo: false, appetite: { decision: 'IN_APPETITE', reasons: [] } },
    });
    const outOfAppetite = await svc.process({
      normalization: { normalized: { riskType: 'earthquake', expectedYield: 0.11 } },
      validation: { flaggedForMoreInfo: false, appetite: { decision: 'OUT_OF_APPETITE', reasons: ['Excluded peril'] } },
    });

    // Same risk type, opposite appetite decisions → opposite grades. An org that
    // writes earthquake is rewarded; one that excludes it is penalized.
    expect(Number(inAppetite.numericScore)).toBeGreaterThan(Number(outOfAppetite.numericScore));
    expect(Number(outOfAppetite.numericScore)).toBeLessThan(60);
  });
});
