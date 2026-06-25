export const organizationTypes = ['investor_fund', 'insurer', 'admin', 'partner'] as const;
export const userRoles = ['investor', 'insurer', 'admin', 'analyst', 'partner'] as const;
export const accreditationStatuses = ['pending', 'verified', 'rejected', 'expired'] as const;
export const kycStatuses = ['pending', 'verified', 'rejected', 'expired'] as const;
export const submissionStatuses = ['draft', 'submitted', 'modeling', 'priced', 'compliance', 'approved', 'quoted', 'bound', 'rejected'] as const;
// A quote/offer lifecycle, distinct from the submission's. A quote is created in
// `issued` (delivered to the cedent/broker), accepted/declined/withdrawn, expires
// at `validUntil`, and reaches the terminal `bound` when converted to a Policy.
export const quoteStatuses = ['draft', 'issued', 'accepted', 'declined', 'expired', 'withdrawn', 'bound'] as const;
// A bound policy's lifecycle state, carried on the Policy header and each PolicyVersion.
export const policyStatuses = ['in_force', 'cancelled', 'expired', 'lapsed'] as const;
// Why a PolicyVersion was written — the first version is an `issuance`; later
// versions are endorsements/cancellations/renewals (each an immutable snapshot).
export const policyChangeTypes = ['issuance', 'endorsement', 'cancellation', 'renewal'] as const;

// --- Signature service (standalone, entity-agnostic collection point) ---
// A signature request envelope's overall state, derived from its signers.
export const signatureRequestStatuses = ['pending', 'partially_signed', 'completed', 'declined', 'voided', 'expired'] as const;
// One signer's state within a request.
export const signatureStatuses = ['pending', 'signed', 'declined'] as const;
// How a signature mark was captured — no third-party e-sign dependency.
export const signatureCaptureTypes = ['typed', 'drawn', 'clickwrap'] as const;
export const spvStatuses = ['raising', 'active', 'closed'] as const;
export const dealStatuses = ['draft', 'underwriting', 'approved', 'fundraising', 'active', 'closed'] as const;
export const orderTypes = ['buy', 'sell'] as const;
export const orderStatuses = ['pending', 'partially_filled', 'filled', 'cancelled'] as const;
export const claimStatuses = ['submitted', 'reviewing', 'approved', 'rejected', 'paid'] as const;
export const ledgerEntryTypes = ['debit', 'credit'] as const;
export const collateralMovementTypes = ['deposit', 'payout', 'yield', 'release'] as const;
export const tokenTransactionTypes = ['mint', 'transfer', 'burn'] as const;
export const feeTypes = ['management', 'performance', 'transaction'] as const;
export const orderSideTypes = orderTypes;
export const auditActions = ['created', 'updated', 'deleted', 'executed', 'approved', 'rejected'] as const;
export const policyTypes = ['homeowners', 'commercial', 'auto', 'marine', 'life'] as const;
export const assetTypes = ['building', 'contents', 'vehicle', 'business_interruption'] as const;
export const constructionTypes = ['wood', 'masonry', 'steel', 'concrete'] as const;
export const occupancyTypes = ['residential', 'commercial', 'industrial', 'mixed'] as const;
export const triggerTypes = ['indemnity', 'parametric', 'index'] as const;
export const perilCodes = ['hurricane', 'flood', 'earthquake', 'storm', 'wildfire'] as const;
