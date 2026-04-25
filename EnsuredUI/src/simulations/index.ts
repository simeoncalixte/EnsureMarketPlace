/**
 * Simulations Index
 *
 * Each simulation maps to a discrete phase of a full reinsurance transaction
 * on the Ensured Marketplace platform. They are designed to be run in order
 * or independently to exercise specific platform capabilities.
 *
 * Execution order for a complete end-to-end transaction:
 *
 *  1. IdentityOnboarding        – Register orgs, users, KYC, accreditation, wallets
 *  2. InsurerRiskSubmission     – Insurer creates a risk portfolio and submits it
 *  3. UnderwritingPricing       – Analyst runs models, creates pricing & risk metrics
 *  4. DealStructuring           – SPV, deal, tranches, and tokens are created
 *  5. CapitalRaising            – Investors commit capital; collateral is deposited; tokens minted
 *  6. OrderBookTrading          – Buy/sell orders placed, matched into trades
 *  7. ActiveDealMonitoring      – Deal goes live; ongoing risk metrics & platform events tracked
 *  8. ClaimAndPayout            – Catastrophe event, claim submission, approval, and payout distribution
 *  9. GovernanceAudit           – Ledger reconciliation, fee accrual, audit trail, documents
 */

export * from './01-IdentityOnboarding';
export * from './02-InsurerRiskSubmission';
export * from './03-UnderwritingPricing';
export * from './04-DealStructuring';
export * from './05-CapitalRaising';
export * from './06-OrderBookTrading';
export * from './07-ActiveDealMonitoring';
export * from './08-ClaimAndPayout';
export * from './09-GovernanceAudit';
