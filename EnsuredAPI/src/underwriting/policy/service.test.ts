// Mock the model layer so bind runs with no database.
jest.mock('../../db/models', () => ({
  Submission: { findByPk: jest.fn() },
  Quote: { findOne: jest.fn() },
  QuoteVersion: { findOne: jest.fn() },
  CanonicalSubmission: { findOne: jest.fn() },
  Policy: { create: jest.fn() },
  PolicyVersion: { create: jest.fn() },
  ExposureUnit: { create: jest.fn() },
}));

import { CanonicalSubmission, ExposureUnit, Policy, PolicyVersion, Quote, QuoteVersion, Submission } from '../../db/models';
import { bindQuoteForSubmission } from './service';

const findSubmission = Submission.findByPk as unknown as jest.Mock;
const findQuote = Quote.findOne as unknown as jest.Mock;
const findQuoteVersion = QuoteVersion.findOne as unknown as jest.Mock;
const findCanonical = CanonicalSubmission.findOne as unknown as jest.Mock;
const createPolicy = Policy.create as unknown as jest.Mock;
const createPolicyVersion = PolicyVersion.create as unknown as jest.Mock;
const createExposure = ExposureUnit.create as unknown as jest.Mock;

beforeEach(() => {
  [findSubmission, findQuote, findQuoteVersion, findCanonical, createPolicy, createPolicyVersion, createExposure]
    .forEach((m) => m.mockReset());
  createPolicy.mockResolvedValue({ id: 900, externalPolicyId: 'POL-000001' });
  createPolicyVersion.mockResolvedValue({ id: 1 });
  createExposure.mockResolvedValue({});
});

function submissionStub() {
  return { id: 1, insurerProfileId: 3, portfolioId: null, status: 'quoted', update: jest.fn() };
}

describe('bindQuoteForSubmission — guards', () => {
  it('requires an accepted quote', async () => {
    findSubmission.mockResolvedValue(submissionStub());
    findQuote.mockResolvedValue({ id: 50, status: 'issued', update: jest.fn() });
    await expect(bindQuoteForSubmission(1)).rejects.toThrow(/quote_not_accepted/);
  });

  it('refuses to bind an already-bound quote', async () => {
    findSubmission.mockResolvedValue(submissionStub());
    findQuote.mockResolvedValue({ id: 50, status: 'bound', update: jest.fn() });
    await expect(bindQuoteForSubmission(1)).rejects.toThrow(/quote_already_bound/);
  });

  it('requires an insurer profile', async () => {
    findSubmission.mockResolvedValue({ id: 1, insurerProfileId: null, portfolioId: null, update: jest.fn() });
    findQuote.mockResolvedValue({ id: 50, status: 'accepted', update: jest.fn() });
    findQuoteVersion.mockResolvedValue({ id: 500, premium: '1000000.00', update: jest.fn() });
    findCanonical.mockResolvedValue(null);
    await expect(bindQuoteForSubmission(1)).rejects.toThrow(/insurer_profile_required/);
  });
});

describe('bindQuoteForSubmission — issuance + exposure materialization', () => {
  it('creates an in-force policy, v1 issuance, and one exposure per insured subject', async () => {
    const submission = submissionStub();
    const quote = { id: 50, status: 'accepted', update: jest.fn() };
    const quoteVersion = {
      id: 500,
      premium: '1000000.00',
      coverageLimit: '5000000.00',
      deductible: '250000.00',
      effectiveDate: null,
      expirationDate: null,
      termsJson: null,
      update: jest.fn(),
    };
    findSubmission.mockResolvedValue(submission);
    findQuote.mockResolvedValue(quote);
    findQuoteVersion.mockResolvedValue(quoteVersion);
    findCanonical.mockResolvedValue({
      lineOfBusinessCode: 'commercial_property',
      data: {
        subjects: [
          { label: 'Warehouse #3', assetType: 'building', insuredValue: 6_000_000 },
          { label: 'HQ Office', assetType: 'building', insuredValue: 4_000_000 },
        ],
      },
    });

    const result = await bindQuoteForSubmission(1, { now: () => new Date('2026-06-13T00:00:00.000Z') });

    expect(createPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        externalPolicyId: 'POL-000001',
        insurerProfileId: 3,
        status: 'in_force',
        currentVersionNumber: 1,
        policyType: 'commercial', // mapped from commercial_property
        premium: '1000000.00',
        coverageLimit: '5000000.00',
        sourceQuoteId: 50,
      }),
    );
    expect(createPolicyVersion).toHaveBeenCalledWith(
      expect.objectContaining({ versionNumber: 1, changeType: 'issuance', status: 'in_force', sourceQuoteVersionId: 500 }),
    );
    // One ExposureUnit per insured subject, linked to the new policy.
    expect(createExposure).toHaveBeenCalledTimes(2);
    expect(createExposure).toHaveBeenNthCalledWith(1, expect.objectContaining({ policyId: 900, subjectIndex: 0, exposureRef: 'POL-000001-EXP-0001' }));
    // The loop closes: quote bound (+ policy link), submission bound.
    expect(quote.update).toHaveBeenCalledWith({ status: 'bound', boundPolicyId: 900 });
    expect(quoteVersion.update).toHaveBeenCalledWith({ status: 'bound' });
    expect(submission.update).toHaveBeenCalledWith({ status: 'bound' });
    expect(result).toMatchObject({ policyId: 900, status: 'in_force', versionNumber: 1, exposuresCreated: 2, policyType: 'commercial' });
  });

  it('binds a single unitemized risk with no exposures', async () => {
    findSubmission.mockResolvedValue(submissionStub());
    findQuote.mockResolvedValue({ id: 50, status: 'accepted', update: jest.fn() });
    findQuoteVersion.mockResolvedValue({ id: 500, premium: '750000.00', coverageLimit: null, deductible: null, effectiveDate: null, expirationDate: null, termsJson: null, update: jest.fn() });
    findCanonical.mockResolvedValue({ lineOfBusinessCode: 'cyber', data: {} });

    const result = await bindQuoteForSubmission(1);
    expect(createExposure).not.toHaveBeenCalled();
    expect(result.exposuresCreated).toBe(0);
  });
});
