# Task reasoning — schema & UI updates

This document explains the rationale for each proposed update to align the codebase with the `reinsurance_policy_structuring.md` spec.

- Add `Policy` model
  - Reasoning: The spec centers on policy-level data (policy_id, policy_type, effective/expiration dates, premium, insured_value, deductible, coverage_limit, underwriting_score). A first-class `Policy` entity is required to ingest, normalize, and track individual policies before grouping them into portfolios and deals.

- Add `ExposureUnit` model
  - Reasoning: Risk modeling and packaging require fine-grained exposure units (asset-level) with fields like asset_type, construction_type, occupancy_type, replacement_cost, geolocation (lat/long), vulnerability_score. Exposures drive portfolio aggregation and parametric mapping.

- Link `Policy`/`Exposure` → `RiskPortfolio` / `Submission`
  - Reasoning: Portfolios are built from policies/exposures. Explicit FK relationships enable automated aggregation (total_exposure, total_premium) and traceability from SPV/Deal back to source policies.

- Add geolocation fields and standardized peril codes
  - Reasoning: Accurate modeling and parametric triggers need lat/long and canonical peril classifications (lookup/enums). Text-only region fields are insufficient for spatial queries and zonation.

- Add `TrancheSubscription` (investor → tranche mapping)
  - Reasoning: The existing models track SPV ownership and capital commitments at deal level, but the spec requires mapping investor capital to particular tranches (committed/deployed amounts per tranche) for payout attribution and tokenization.

- Extend risk metrics schema (var95, var99, expectedLoss, tail metrics)
  - Reasoning: Only `var99` and `expectedLoss` exist sparsely; the spec asks for multiple VaR percentiles and tail risk metrics. A normalized metrics table with tags and attribution (portfolio/deal/tranche/modelRun) improves analytics and reporting.

- Add `Trigger` / `ParametricDefinition` models
  - Reasoning: To support indemnity, parametric, and index triggers the system needs typed trigger definitions and parametric formulas or index mappings that can be auditable and used to compute payouts programmatically.

- Add `ClaimCalculation` / audit trail for payouts
  - Reasoning: Claims require auditable calculation records capturing inputs (event data, model outputs, parameters), steps, and references to model runs or index feeds for regulatory and investor transparency.

- Extend `Document` into `LegalDocument` with stricter types
  - Reasoning: SPV incorporation docs, reinsurance contracts, and investor agreements need typed metadata (doc type, required flag, signer, issuance date) to support compliance checks and automated workflows.

- Add portfolio-level aggregate fields
  - Reasoning: Store portfolio-level `expectedLoss`, `var95`, `var99`, and other aggregates so UI and reporting can show normalized portfolio risk without recomputing on demand.

- Currency normalization and standardization metadata
  - Reasoning: Normalize currency at ingestion and capture normalization metadata (exchange rate, snapshot time) to ensure consistent aggregation across mixed-currency policies.

- Indexes, FKs, and constraints
  - Reasoning: Add appropriate DB indexes and unique constraints (e.g., policy identifiers, exposure uniqueness, tranche-subscription unique index) and foreign keys for data integrity and query performance.

- UI: impersonation button (already implemented)
  - Reasoning: Admin UX — quick, auditable impersonation during support and testing. Implementation uses the existing server impersonation route, prompts for admin id (stored locally), and copies the returned token to clipboard for quick testing.

Next steps
- If you want, I can scaffold the models + migrations for `Policy` and `ExposureUnit` and add basic tests and associations.
- Alternatively I can produce a per-field mapping document (markdown table) tying every spec field to a DB column and proposed migration SQL.

---
Generated on: 2026-04-07
