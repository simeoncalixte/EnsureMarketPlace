import Fastify from 'fastify';
import { createPipelineTransformationReporter } from '../../../test/helpers/pipelineTransformations';
import { submissionTypeRoute } from './route';
import { classifySubmissionType, SubmissionTypeService } from './service';
import type { SubmissionTypeAgent, SubmissionTypeInput } from './GeminiSubmissionTypeProvider';

describe('Submission-type pipeline routes', () => {
  const transformations = createPipelineTransformationReporter('submissionType');
  let app: any;
  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(submissionTypeRoute, { prefix: '/api' });
    await app.ready();
  });
  afterAll(async () => {
    if (app && typeof app.close === 'function') await app.close();
    await transformations.write();
  });

  test('GET /api/pipeline/submission-type/health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/pipeline/submission-type/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ status: 'ok', service: 'submissionType' });
  });
});

describe('classifySubmissionType (pure heuristic)', () => {
  const transformations = createPipelineTransformationReporter('submissionType');
  afterAll(async () => transformations.write());

  test('maps a first-notice-of-loss document to a claim', () => {
    const input = {
      text: [
        'FIRST NOTICE OF LOSS',
        'Date of Loss: 2026-05-12',
        'Claimant: Acme Logistics LLC',
        'Adjuster assigned to review the reported loss.',
      ].join('\n'),
    };
    const result = classifySubmissionType(input);

    transformations.record({
      stage: 'submissionType',
      testName: 'maps a first-notice-of-loss document to a claim',
      description: 'OCR text is triaged into a submission/transaction type and subtype.',
      before: input,
      after: result,
    });

    expect(result.submissionTypeCode).toBe('claim');
    expect(result.submissionSubTypeCode).toBe('claim_first_notice_of_loss');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    expect(result.needsReview).toBe(false);
  });

  test('maps a mid-term add-location request to an endorsement', () => {
    const result = classifySubmissionType({
      text: 'Please process this mid-term endorsement to add location at 50 Harbor St to the existing policy effective 2026-06-01.',
    });
    expect(result.submissionTypeCode).toBe('endorsement');
    expect(result.submissionSubTypeCode).toBe('endorsement_add_location');
  });

  test('maps a quota-share cession across the book to a treaty', () => {
    const result = classifySubmissionType({
      text: 'Reinsurance treaty placement: the ceding company seeks a 40% quota share across its whole property book.',
    });
    expect(result.submissionTypeCode).toBe('treaty_reinsurance');
    expect(result.submissionSubTypeCode).toBe('treaty_reinsurance_quota_share');
  });

  test('maps a single-risk fac certificate to facultative reinsurance', () => {
    const result = classifySubmissionType({
      text: 'Facultative reinsurance submission — please review this single risk cession and issue a fac certificate.',
    });
    expect(result.submissionTypeCode).toBe('facultative_reinsurance');
  });

  test('returns an explicit unknown result when no keyword matches', () => {
    // Garbled OCR / non-insurance text must NOT silently become a default type.
    const result = classifySubmissionType({ text: 'zzqx 8812 vortma lpejq nnnn' });
    expect(result.submissionTypeCode).toBe('unknown');
    expect(result.submissionTypeLabel).toBe('Unknown');
    expect(result.confidence).toBe(0);
    expect(result.needsReview).toBe(true);
    expect(result.alternatives).toEqual([]);
  });
});

describe('SubmissionTypeService.process (no persistence)', () => {
  test('returns the structured stage contract for ad-hoc text', async () => {
    const svc = new SubmissionTypeService({
      submissionTypeAgent: { isAvailable: () => false } as SubmissionTypeAgent,
    });
    const result = await svc.process({ text: 'Renewal terms for the expiring policy; renewal effective at the anniversary date.' });

    expect(result.ok).toBe(true);
    expect(result.service).toBe('submissionType');
    expect(result.submissionTypeCode).toBe('renewal');
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  test('falls back to the heuristic (with a warning) when the agent throws', async () => {
    const flakyAgent: SubmissionTypeAgent = {
      isAvailable: () => true,
      determine: async (_input: SubmissionTypeInput) => {
        throw new Error('gemini boom');
      },
    };
    const svc = new SubmissionTypeService({ submissionTypeAgent: flakyAgent });
    const result = await svc.process({ text: 'Notice of cancellation for non-payment of premium; cancel the policy.' });

    expect(result.ok).toBe(true);
    expect(result.submissionTypeCode).toBe('cancellation');
    expect(result.warnings).toHaveLength(1);
    expect(String((result.warnings as string[])[0])).toMatch(/agent failed/i);
  });
});
