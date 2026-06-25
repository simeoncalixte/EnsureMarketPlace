/**
 * Canonical SUBMISSION-TYPE (transaction-type) taxonomy.
 *
 * This is a DISTINCT dimension from the line-of-business taxonomy
 * (`lineOfBusinessTaxonomy.ts`). LOB answers "what risk is this?" (cyber,
 * property, marine …). The submission type answers "what KIND of work order is
 * this?" — a brand-new risk to quote, a renewal, a mid-term endorsement, a loss
 * notice/claim, a cancellation, or a reinsurance treaty/facultative placement.
 *
 * The pipeline determines the submission type right after OCR, BEFORE the LOB
 * classifier, because the type decides how the rest of the pipeline should treat
 * the document (a claim and a new-business submission can share the same LOB but
 * need completely different downstream handling).
 *
 * Mirrors the LOB taxonomy's shape (code + label + sub-types) so the heuristic
 * and the Gemini agent can reuse the same scoring/validation machinery.
 */

type SubTypeSeed = readonly [suffix: string, label: string];

type PrimarySeed = {
  code: string;
  label: string;
  subTypes: Array<{
    code: string;
    label: string;
  }>;
};

function makePrimary(code: string, label: string, subTypes: readonly SubTypeSeed[]): PrimarySeed {
  return {
    code,
    label,
    subTypes: subTypes.map(([suffix, subLabel]) => ({
      code: `${code}_${suffix}`,
      label: subLabel,
    })),
  };
}

export const submissionTypeTaxonomy: PrimarySeed[] = [
  makePrimary('new_business', 'New Business', [
    ['direct', 'Direct'],
    ['broker_submission', 'Broker Submission'],
    ['mga_binder', 'MGA / Binder'],
  ]),
  makePrimary('renewal', 'Renewal', [
    ['as_is', 'As-Is Renewal'],
    ['repriced', 'Repriced Renewal'],
    ['remarketed', 'Remarketed'],
  ]),
  makePrimary('quote_request', 'Quote Request', [
    ['indication', 'Indication'],
    ['firm_quote', 'Firm Quote'],
  ]),
  makePrimary('endorsement', 'Endorsement', [
    ['add_location', 'Add Location / Exposure'],
    ['remove_location', 'Remove Location / Exposure'],
    ['change_limit', 'Limit / Deductible Change'],
    ['named_insured', 'Named-Insured Change'],
    ['coverage_change', 'Coverage Change'],
  ]),
  makePrimary('cancellation', 'Cancellation', [
    ['insured_request', 'Insured Request'],
    ['non_payment', 'Non-Payment'],
    ['underwriting', 'Underwriting Cancellation'],
  ]),
  makePrimary('claim', 'Claim / Loss Notice', [
    ['first_notice_of_loss', 'First Notice of Loss'],
    ['claim_update', 'Claim Update / Status'],
    ['loss_run', 'Loss Run / Loss History'],
    ['subrogation', 'Subrogation'],
  ]),
  makePrimary('audit', 'Premium Audit', [
    ['payroll', 'Payroll Audit'],
    ['exposure', 'Exposure Audit'],
  ]),
  makePrimary('treaty_reinsurance', 'Treaty Reinsurance', [
    ['quota_share', 'Quota Share'],
    ['surplus', 'Surplus Share'],
    ['excess_of_loss', 'Excess of Loss'],
    ['stop_loss', 'Stop Loss'],
  ]),
  makePrimary('facultative_reinsurance', 'Facultative Reinsurance', [
    ['proportional', 'Proportional'],
    ['excess_of_loss', 'Excess of Loss'],
  ]),
  makePrimary('inquiry', 'Inquiry / Other', [
    ['general', 'General Inquiry'],
    ['document_request', 'Document Request'],
  ]),
];

/** Every primary submission-type code, e.g. for validating a caller-chosen type. */
export const SUBMISSION_TYPE_CODES: readonly string[] = submissionTypeTaxonomy.map((type) => type.code);
