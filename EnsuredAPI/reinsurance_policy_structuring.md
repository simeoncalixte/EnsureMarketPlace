
# Reinsurance Policy Structuring & Packaging Guide

## 1. Core Objective

Structure insurance policies so they can be:
- Aggregated into portfolios
- Modeled for risk
- Transferred to reinsurance (SPVs or reinsurers)
- Tokenized or capitalized

---

## 2. Policy-Level Data Requirements

Each policy must contain standardized, structured data.

### Policy Entity

- policy_id
- insurer_id
- policy_type (homeowners, commercial, etc.)
- effective_date
- expiration_date
- premium
- insured_value
- deductible
- coverage_limit
- location (lat, long, region)
- peril_coverage (hurricane, flood, earthquake)
- underwriting_score

---

## 3. Exposure Data (Critical for Packaging)

### Exposure Unit

- exposure_id
- policy_id
- asset_type
- construction_type
- occupancy_type
- replacement_cost
- geolocation
- vulnerability_score

---

## 4. Risk Normalization

Policies must be normalized into comparable units.

### Standardization Includes:

- Currency normalization
- Geographic zoning
- Peril classification
- Time alignment

---

## 5. Portfolio Construction

Policies are grouped into portfolios.

### Portfolio Entity

- portfolio_id
- insurer_id
- region
- peril_type
- total_exposure
- total_premium
- expected_loss
- created_at

---

## 6. Risk Layering (Reinsurance Structure)

Reinsurance operates in layers.

### Example:

- Attachment Point: $100M
- Exhaustion Point: $150M

### Layer Entity

- layer_id
- portfolio_id
- attachment_point
- exhaustion_point
- limit
- premium
- expected_loss
- return_rate

---

## 7. Tranching (Investor Packaging)

Layers can be split into tranches.

### Tranche Entity

- tranche_id
- layer_id
- risk_level (low, medium, high)
- capital_required
- expected_return
- loss_probability

---

## 8. SPV Packaging

Each portfolio/layer is wrapped into a Special Purpose Vehicle (SPV).

### SPV Entity

- spv_id
- legal_name
- jurisdiction
- regulator
- deal_id
- total_capital
- status

---

## 9. Capital Matching

Investor capital is matched to tranches.

### Capital Allocation

- allocation_id
- investor_id
- tranche_id
- committed_amount
- deployed_amount

---

## 10. Event Trigger Design

Define how payouts occur.

### Trigger Types

1. Indemnity (actual losses)
2. Parametric (event-based)
3. Index-based

### Event Entity

- event_id
- type
- location
- severity
- timestamp

---

## 11. Claims Mapping

Map events to losses.

### Claim Entity

- claim_id
- portfolio_id
- event_id
- loss_amount
- payout_amount
- status

---

## 12. Pricing Requirements

Each package must include:

- Expected Loss
- Value at Risk (VaR)
- Tail Risk
- Premium
- Risk-adjusted return

---

## 13. Legal Requirements

Each packaged group must include:

- Reinsurance contract
- SPV incorporation documents
- Investor agreements
- Disclosure documents

---

## 14. Packaging Flow

1. Ingest policies
2. Normalize exposure data
3. Group into portfolios
4. Model risk
5. Create layers
6. Split into tranches
7. Create SPV
8. Allocate capital
9. Activate coverage

---

## 15. Key Insight

A “package” is not just grouping policies.

It is:
- A legally defined risk transfer structure
- A financially modeled asset
- A capital-backed instrument

Failure in structuring leads to:
- Mispricing
- Insolvency risk
- Regulatory violations
