// Mock the model layer so the service runs with no database.
jest.mock('../../../db/models', () => ({
  Submission: { findByPk: jest.fn() },
  ComplianceClearance: { findOne: jest.fn() },
  Pricing: { findOne: jest.fn() },
  PricingVersion: { findOne: jest.fn() },
  Quote: { findOrCreate: jest.fn() },
  QuoteVersion: { findOne: jest.fn(), create: jest.fn() },
}));

import { ComplianceClearance, Pricing, PricingVersion, Quote, QuoteVersion, Submission } from '../../../db/models';
import { ComplianceGateError, issueQuoteForSubmission } from './service';

const findSubmission = Submission.findByPk as unknown as jest.Mock;
const findClearance = ComplianceClearance.findOne as unknown as jest.Mock;
const findPricing = Pricing.findOne as unknown as jest.Mock;
const findPricingVersion = PricingVersion.findOne as unknown as jest.Mock;
const findOrCreateQuote = Quote.findOrCreate as unknown as jest.Mock;
const findQuoteVersion = QuoteVersion.findOne as unknown as jest.Mock;
const createQuoteVersion = QuoteVersion.create as unknown as jest.Mock;

function submissionStub() {
  return { id: 1, organizationId: 9, insurerProfileId: 3, status: 'approved', update: jest.fn() };
}
function quoteStub(overrides: Record<string, unknown> = {}) {
  return { id: 50, status: 'issued', insurerProfileId: 3, quoteNumber: 'Q-000001', update: jest.fn(), ...overrides };
}

beforeEach(() => {
  [findSubmission, findClearance, findPricing, findPricingVersion, findOrCreateQuote, findQuoteVersion, createQuoteVersion]
    .forEach((m) => m.mockReset());
  createQuoteVersion.mockResolvedValue({ id: 500 });
});

describe('issueQuoteForSubmission — compliance gate', () => {
  it('blocks issuance when there is no passed clearance', async () => {
    findSubmission.mockResolvedValue(submissionStub());
    findClearance.mockResolvedValue({ status: 'review' });

    await expect(issueQuoteForSubmission(1)).rejects.toBeInstanceOf(ComplianceGateError);
    expect(findOrCreateQuote).not.toHaveBeenCalled();
  });

  it('blocks issuance when compliance was never run', async () => {
    findSubmission.mockResolvedValue(submissionStub());
    findClearance.mockResolvedValue(null);
    await expect(issueQuoteForSubmission(1)).rejects.toBeInstanceOf(ComplianceGateError);
  });

  it('404s an unknown submission', async () => {
    findSubmission.mockResolvedValue(null);
    await expect(issueQuoteForSubmission(999)).rejects.toThrow(/submission_not_found/);
  });
});

describe('issueQuoteForSubmission — happy path & versioning', () => {
  it('builds the offer on the latest PricingVersion and issues version 1', async () => {
    const submission = submissionStub();
    const quote = quoteStub({ status: 'issued' });
    findSubmission.mockResolvedValue(submission);
    findClearance.mockResolvedValue({ status: 'passed' });
    findPricing.mockResolvedValue({ id: 10 });
    findPricingVersion.mockResolvedValue({ id: 99, premium: '1000000.00', versionNumber: 2 });
    findOrCreateQuote.mockResolvedValue([quote, true]);
    findQuoteVersion.mockResolvedValue(null); // no prior version

    const result = await issueQuoteForSubmission(1, { now: () => new Date('2026-06-13T00:00:00.000Z') });

    expect(result).toMatchObject({
      quoteId: 50,
      quoteNumber: 'Q-000001',
      versionNumber: 1,
      status: 'issued',
      premium: '1000000.00',
      pricingVersionId: 99,
    });
    // QuoteVersion snapshots the priced premium + links the PricingVersion.
    expect(createQuoteVersion).toHaveBeenCalledWith(
      expect.objectContaining({ quoteId: 50, versionNumber: 1, pricingVersionId: 99, premium: '1000000.00', status: 'issued' }),
    );
    // The submission lifecycle reflects the issued quote.
    expect(submission.update).toHaveBeenCalledWith({ status: 'quoted' });
  });

  it('re-issue appends the next version (audit trail preserved)', async () => {
    findSubmission.mockResolvedValue(submissionStub());
    findClearance.mockResolvedValue({ status: 'passed' });
    findPricing.mockResolvedValue({ id: 10 });
    findPricingVersion.mockResolvedValue({ id: 101, premium: '2000000.00', versionNumber: 3 });
    findOrCreateQuote.mockResolvedValue([quoteStub({ status: 'declined' }), false]);
    findQuoteVersion.mockResolvedValue({ versionNumber: 2 }); // a prior version exists

    const result = await issueQuoteForSubmission(1, { overrides: { premium: 2_100_000 } });

    expect(result.versionNumber).toBe(3); // 2 + 1
    expect(createQuoteVersion).toHaveBeenCalledWith(expect.objectContaining({ versionNumber: 3, premium: '2100000.00' }));
  });

  it('refuses to re-issue a bound quote', async () => {
    findSubmission.mockResolvedValue(submissionStub());
    findClearance.mockResolvedValue({ status: 'passed' });
    findPricing.mockResolvedValue({ id: 10 });
    findPricingVersion.mockResolvedValue({ id: 99, premium: '1000000.00', versionNumber: 1 });
    findOrCreateQuote.mockResolvedValue([quoteStub({ status: 'bound' }), false]);

    await expect(issueQuoteForSubmission(1)).rejects.toThrow(/quote_already_bound/);
  });
});
