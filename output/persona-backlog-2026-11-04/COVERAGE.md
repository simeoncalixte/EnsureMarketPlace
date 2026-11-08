# Persona feedback → Jira delivery map

Date: 2026-11-04. Scope: create/reconcile user stories from all 60 insurer, broker and reinsurer criticisms, with explicit acceptance criteria and Definition of Done. Preserve document-driven LLM form generation and existing implementation obligations.

Live Jira baseline: all 85 AIN issues refreshed, including descriptions, parents, statuses, links and subtasks. No baseline native subtasks were present. Current source and generated-form/catalog documentation were reviewed. Earlier findings are not assumed to be current missing behavior.

## Coverage

Overlapping concerns share stories: 35 new stories, 2 reused stories (AIN-79/80), 1 new broker coordination epic, and 9 implementation subtasks where no existing task adequately owns the new workflow. All 60 feedback points are mapped below.

### Insurer

| Feedback | Concern | Jira stories |
| --- | --- | --- |
| I1 | Claims credibility | [AIN-114](https://simeoncalixte1990.atlassian.net/browse/AIN-114) |
| I2 | Fragmented claims experience | [AIN-114](https://simeoncalixte1990.atlassian.net/browse/AIN-114), [AIN-118](https://simeoncalixte1990.atlassian.net/browse/AIN-118) |
| I3 | Underwriting priorities | [AIN-98](https://simeoncalixte1990.atlassian.net/browse/AIN-98), [AIN-106](https://simeoncalixte1990.atlassian.net/browse/AIN-106) |
| I4 | Decision traceability | [AIN-99](https://simeoncalixte1990.atlassian.net/browse/AIN-99) |
| I5 | Extraction confidence | [AIN-87](https://simeoncalixte1990.atlassian.net/browse/AIN-87) |
| I6 | Change impact | [AIN-95](https://simeoncalixte1990.atlassian.net/browse/AIN-95) |
| I7 | Authority controls | [AIN-99](https://simeoncalixte1990.atlassian.net/browse/AIN-99), [AIN-107](https://simeoncalixte1990.atlassian.net/browse/AIN-107) |
| I8 | Portfolio accumulation | [AIN-101](https://simeoncalixte1990.atlassian.net/browse/AIN-101), [AIN-117](https://simeoncalixte1990.atlassian.net/browse/AIN-117) |
| I9 | Pricing governance | [AIN-100](https://simeoncalixte1990.atlassian.net/browse/AIN-100) |
| I10 | Coverage certainty | [AIN-108](https://simeoncalixte1990.atlassian.net/browse/AIN-108), [AIN-113](https://simeoncalixte1990.atlassian.net/browse/AIN-113) |
| I11 | Post-bind amendments | [AIN-112](https://simeoncalixte1990.atlassian.net/browse/AIN-112) |
| I12 | Premium reconciliation | [AIN-89](https://simeoncalixte1990.atlassian.net/browse/AIN-89), [AIN-90](https://simeoncalixte1990.atlassian.net/browse/AIN-90) |
| I13 | Delegated authority oversight | [AIN-107](https://simeoncalixte1990.atlassian.net/browse/AIN-107) |
| I14 | Reporting quality | [AIN-104](https://simeoncalixte1990.atlassian.net/browse/AIN-104) |
| I15 | Renewal preparation | [AIN-115](https://simeoncalixte1990.atlassian.net/browse/AIN-115) |
| I16 | Operational accountability | [AIN-106](https://simeoncalixte1990.atlassian.net/browse/AIN-106), [AIN-116](https://simeoncalixte1990.atlassian.net/browse/AIN-116) |
| I17 | System integration | [AIN-119](https://simeoncalixte1990.atlassian.net/browse/AIN-119) |
| I18 | Management reporting | [AIN-94](https://simeoncalixte1990.atlassian.net/browse/AIN-94), [AIN-80](https://simeoncalixte1990.atlassian.net/browse/AIN-80) |
| I19 | Operational resilience | [AIN-93](https://simeoncalixte1990.atlassian.net/browse/AIN-93) |
| I20 | Adoption economics | [AIN-121](https://simeoncalixte1990.atlassian.net/browse/AIN-121) |

### Broker

| Feedback | Concern | Jira stories |
| --- | --- | --- |
| B1 | Client-centered navigation | [AIN-91](https://simeoncalixte1990.atlassian.net/browse/AIN-91) |
| B2 | Duplicate entry | [AIN-87](https://simeoncalixte1990.atlassian.net/browse/AIN-87), [AIN-95](https://simeoncalixte1990.atlassian.net/browse/AIN-95), [AIN-119](https://simeoncalixte1990.atlassian.net/browse/AIN-119) |
| B3 | Submission readiness | [AIN-87](https://simeoncalixte1990.atlassian.net/browse/AIN-87), [AIN-98](https://simeoncalixte1990.atlassian.net/browse/AIN-98) |
| B4 | Market suitability | [AIN-79](https://simeoncalixte1990.atlassian.net/browse/AIN-79) |
| B5 | Functional discovery controls | [AIN-79](https://simeoncalixte1990.atlassian.net/browse/AIN-79) |
| B6 | Selective disclosure | [AIN-102](https://simeoncalixte1990.atlassian.net/browse/AIN-102) |
| B7 | Client confidentiality | [AIN-102](https://simeoncalixte1990.atlassian.net/browse/AIN-102) |
| B8 | Market approach tracking | [AIN-110](https://simeoncalixte1990.atlassian.net/browse/AIN-110) |
| B9 | Comparable quotations | [AIN-103](https://simeoncalixte1990.atlassian.net/browse/AIN-103) |
| B10 | Negotiation clarity | [AIN-103](https://simeoncalixte1990.atlassian.net/browse/AIN-103) |
| B11 | Placement completeness | [AIN-88](https://simeoncalixte1990.atlassian.net/browse/AIN-88), [AIN-108](https://simeoncalixte1990.atlassian.net/browse/AIN-108), [AIN-110](https://simeoncalixte1990.atlassian.net/browse/AIN-110) |
| B12 | Client presentation | [AIN-109](https://simeoncalixte1990.atlassian.net/browse/AIN-109) |
| B13 | Client approvals | [AIN-109](https://simeoncalixte1990.atlassian.net/browse/AIN-109) |
| B14 | Document delivery | [AIN-113](https://simeoncalixte1990.atlassian.net/browse/AIN-113) |
| B15 | Communication continuity | [AIN-97](https://simeoncalixte1990.atlassian.net/browse/AIN-97) |
| B16 | Commission accounting | [AIN-89](https://simeoncalixte1990.atlassian.net/browse/AIN-89) |
| B17 | Servicing continuity | [AIN-112](https://simeoncalixte1990.atlassian.net/browse/AIN-112), [AIN-114](https://simeoncalixte1990.atlassian.net/browse/AIN-114), [AIN-115](https://simeoncalixte1990.atlassian.net/browse/AIN-115), [AIN-91](https://simeoncalixte1990.atlassian.net/browse/AIN-91) |
| B18 | Team handovers | [AIN-116](https://simeoncalixte1990.atlassian.net/browse/AIN-116) |
| B19 | Relationship protection | [AIN-102](https://simeoncalixte1990.atlassian.net/browse/AIN-102), [AIN-92](https://simeoncalixte1990.atlassian.net/browse/AIN-92) |
| B20 | Commercial value | [AIN-121](https://simeoncalixte1990.atlassian.net/browse/AIN-121) |

### Reinsurer

| Feedback | Concern | Jira stories |
| --- | --- | --- |
| R1 | Submission depth | [AIN-87](https://simeoncalixte1990.atlassian.net/browse/AIN-87), [AIN-96](https://simeoncalixte1990.atlassian.net/browse/AIN-96) |
| R2 | Data quality | [AIN-87](https://simeoncalixte1990.atlassian.net/browse/AIN-87), [AIN-98](https://simeoncalixte1990.atlassian.net/browse/AIN-98) |
| R3 | Loss experience | [AIN-96](https://simeoncalixte1990.atlassian.net/browse/AIN-96) |
| R4 | Exposure reconciliation | [AIN-95](https://simeoncalixte1990.atlassian.net/browse/AIN-95), [AIN-96](https://simeoncalixte1990.atlassian.net/browse/AIN-96) |
| R5 | Treaty specificity | [AIN-105](https://simeoncalixte1990.atlassian.net/browse/AIN-105) |
| R6 | Contract economics | [AIN-105](https://simeoncalixte1990.atlassian.net/browse/AIN-105) |
| R7 | Layer relationships | [AIN-111](https://simeoncalixte1990.atlassian.net/browse/AIN-111) |
| R8 | Reinstatements | [AIN-111](https://simeoncalixte1990.atlassian.net/browse/AIN-111) |
| R9 | Commission complexity | [AIN-89](https://simeoncalixte1990.atlassian.net/browse/AIN-89) |
| R10 | Wording differences | [AIN-103](https://simeoncalixte1990.atlassian.net/browse/AIN-103), [AIN-105](https://simeoncalixte1990.atlassian.net/browse/AIN-105) |
| R11 | Model provenance | [AIN-100](https://simeoncalixte1990.atlassian.net/browse/AIN-100) |
| R12 | Portfolio accumulation | [AIN-101](https://simeoncalixte1990.atlassian.net/browse/AIN-101) |
| R13 | Scenario analysis | [AIN-117](https://simeoncalixte1990.atlassian.net/browse/AIN-117) |
| R14 | Capacity certainty | [AIN-88](https://simeoncalixte1990.atlassian.net/browse/AIN-88) |
| R15 | Counterparty assessment | [AIN-92](https://simeoncalixte1990.atlassian.net/browse/AIN-92) |
| R16 | Collateral visibility | [AIN-90](https://simeoncalixte1990.atlassian.net/browse/AIN-90) |
| R17 | Reporting obligations | [AIN-104](https://simeoncalixte1990.atlassian.net/browse/AIN-104) |
| R18 | Claims and recoveries | [AIN-114](https://simeoncalixte1990.atlassian.net/browse/AIN-114), [AIN-118](https://simeoncalixte1990.atlassian.net/browse/AIN-118) |
| R19 | Retrocession traceability | [AIN-120](https://simeoncalixte1990.atlassian.net/browse/AIN-120) |
| R20 | Settlement and renewal evidence | [AIN-118](https://simeoncalixte1990.atlassian.net/browse/AIN-118), [AIN-90](https://simeoncalixte1990.atlassian.net/browse/AIN-90), [AIN-115](https://simeoncalixte1990.atlassian.net/browse/AIN-115), [AIN-121](https://simeoncalixte1990.atlassian.net/browse/AIN-121) |

## Stories, parents and implementation dependencies

Relates links identify existing shared implementation ownership or completed reuse evidence. Blocks links order the new required predecessor outcomes. They do not turn every historical related issue into a dependency. Original tasks, parents and acceptance criteria are retained.

| Story | Epic | Required implementation owners | Predecessor stories |
| --- | --- | --- | --- |
| [AIN-87](https://simeoncalixte1990.atlassian.net/browse/AIN-87) Review document-generated forms with complete evidence and safe extensions | [AIN-3](https://simeoncalixte1990.atlassian.net/browse/AIN-3) | [AIN-15](https://simeoncalixte1990.atlassian.net/browse/AIN-15), [AIN-16](https://simeoncalixte1990.atlassian.net/browse/AIN-16), [AIN-50](https://simeoncalixte1990.atlassian.net/browse/AIN-50) | None |
| [AIN-95](https://simeoncalixte1990.atlassian.net/browse/AIN-95) Review material changes and preserve corrections when forms regenerate | [AIN-3](https://simeoncalixte1990.atlassian.net/browse/AIN-3) | [AIN-18](https://simeoncalixte1990.atlassian.net/browse/AIN-18), [AIN-50](https://simeoncalixte1990.atlassian.net/browse/AIN-50), [AIN-51](https://simeoncalixte1990.atlassian.net/browse/AIN-51) | [AIN-87](https://simeoncalixte1990.atlassian.net/browse/AIN-87) |
| [AIN-98](https://simeoncalixte1990.atlassian.net/browse/AIN-98) Resolve submission readiness issues before market or underwriting decisions | [AIN-3](https://simeoncalixte1990.atlassian.net/browse/AIN-3) | [AIN-18](https://simeoncalixte1990.atlassian.net/browse/AIN-18), [AIN-53](https://simeoncalixte1990.atlassian.net/browse/AIN-53) | [AIN-87](https://simeoncalixte1990.atlassian.net/browse/AIN-87), [AIN-95](https://simeoncalixte1990.atlassian.net/browse/AIN-95) |
| [AIN-106](https://simeoncalixte1990.atlassian.net/browse/AIN-106) Prioritize underwriting work with ownership deadlines and referrals | [AIN-3](https://simeoncalixte1990.atlassian.net/browse/AIN-3) | [AIN-53](https://simeoncalixte1990.atlassian.net/browse/AIN-53) | [AIN-98](https://simeoncalixte1990.atlassian.net/browse/AIN-98) |
| [AIN-99](https://simeoncalixte1990.atlassian.net/browse/AIN-99) Approve underwriting decisions and exceptions within current authority | [AIN-6](https://simeoncalixte1990.atlassian.net/browse/AIN-6) | [AIN-26](https://simeoncalixte1990.atlassian.net/browse/AIN-26), [AIN-27](https://simeoncalixte1990.atlassian.net/browse/AIN-27), [AIN-28](https://simeoncalixte1990.atlassian.net/browse/AIN-28) | [AIN-95](https://simeoncalixte1990.atlassian.net/browse/AIN-95) |
| [AIN-96](https://simeoncalixte1990.atlassian.net/browse/AIN-96) Review reconciled exposure and loss experience for pricing | [AIN-4](https://simeoncalixte1990.atlassian.net/browse/AIN-4) | [AIN-15](https://simeoncalixte1990.atlassian.net/browse/AIN-15), [AIN-19](https://simeoncalixte1990.atlassian.net/browse/AIN-19), [AIN-22](https://simeoncalixte1990.atlassian.net/browse/AIN-22) | [AIN-87](https://simeoncalixte1990.atlassian.net/browse/AIN-87) |
| [AIN-100](https://simeoncalixte1990.atlassian.net/browse/AIN-100) Inspect reproducible pricing model assumptions and approved overrides | [AIN-4](https://simeoncalixte1990.atlassian.net/browse/AIN-4) | [AIN-19](https://simeoncalixte1990.atlassian.net/browse/AIN-19), [AIN-20](https://simeoncalixte1990.atlassian.net/browse/AIN-20), [AIN-21](https://simeoncalixte1990.atlassian.net/browse/AIN-21), [AIN-23](https://simeoncalixte1990.atlassian.net/browse/AIN-23) | [AIN-96](https://simeoncalixte1990.atlassian.net/browse/AIN-96), [AIN-95](https://simeoncalixte1990.atlassian.net/browse/AIN-95) |
| [AIN-101](https://simeoncalixte1990.atlassian.net/browse/AIN-101) Assess incremental portfolio accumulation before approving capacity | [AIN-5](https://simeoncalixte1990.atlassian.net/browse/AIN-5) | [AIN-24](https://simeoncalixte1990.atlassian.net/browse/AIN-24), [AIN-25](https://simeoncalixte1990.atlassian.net/browse/AIN-25), [AIN-53](https://simeoncalixte1990.atlassian.net/browse/AIN-53) | [AIN-95](https://simeoncalixte1990.atlassian.net/browse/AIN-95) |
| [AIN-88](https://simeoncalixte1990.atlassian.net/browse/AIN-88) Reserve commit expire and release capacity consistently | [AIN-5](https://simeoncalixte1990.atlassian.net/browse/AIN-5) | [AIN-24](https://simeoncalixte1990.atlassian.net/browse/AIN-24), [AIN-25](https://simeoncalixte1990.atlassian.net/browse/AIN-25), [AIN-36](https://simeoncalixte1990.atlassian.net/browse/AIN-36) | None |
| [AIN-107](https://simeoncalixte1990.atlassian.net/browse/AIN-107) Monitor delegated underwriting authority and facility exceptions | [AIN-5](https://simeoncalixte1990.atlassian.net/browse/AIN-5) | [AIN-24](https://simeoncalixte1990.atlassian.net/browse/AIN-24), [AIN-25](https://simeoncalixte1990.atlassian.net/browse/AIN-25), [AIN-28](https://simeoncalixte1990.atlassian.net/browse/AIN-28) | [AIN-88](https://simeoncalixte1990.atlassian.net/browse/AIN-88), [AIN-99](https://simeoncalixte1990.atlassian.net/browse/AIN-99) |
| [AIN-108](https://simeoncalixte1990.atlassian.net/browse/AIN-108) Trace requested coverage through quote binding and servicing handoff | [AIN-6](https://simeoncalixte1990.atlassian.net/browse/AIN-6) | [AIN-26](https://simeoncalixte1990.atlassian.net/browse/AIN-26), [AIN-27](https://simeoncalixte1990.atlassian.net/browse/AIN-27), [AIN-18](https://simeoncalixte1990.atlassian.net/browse/AIN-18) | [AIN-99](https://simeoncalixte1990.atlassian.net/browse/AIN-99), [AIN-88](https://simeoncalixte1990.atlassian.net/browse/AIN-88), [AIN-100](https://simeoncalixte1990.atlassian.net/browse/AIN-100) |
| [AIN-112](https://simeoncalixte1990.atlassian.net/browse/AIN-112) Process endorsements and cancellations with downstream adjustments | [AIN-6](https://simeoncalixte1990.atlassian.net/browse/AIN-6) | [AIN-26](https://simeoncalixte1990.atlassian.net/browse/AIN-26), [AIN-39](https://simeoncalixte1990.atlassian.net/browse/AIN-39), [AIN-51](https://simeoncalixte1990.atlassian.net/browse/AIN-51) | [AIN-108](https://simeoncalixte1990.atlassian.net/browse/AIN-108), [AIN-89](https://simeoncalixte1990.atlassian.net/browse/AIN-89) |
| [AIN-102](https://simeoncalixte1990.atlassian.net/browse/AIN-102) Preview and authorize recipient-specific submission disclosure packages | [AIN-6](https://simeoncalixte1990.atlassian.net/browse/AIN-6) | [AIN-122](https://simeoncalixte1990.atlassian.net/browse/AIN-122) | [AIN-87](https://simeoncalixte1990.atlassian.net/browse/AIN-87), [AIN-95](https://simeoncalixte1990.atlassian.net/browse/AIN-95) |
| [AIN-103](https://simeoncalixte1990.atlassian.net/browse/AIN-103) Compare market quotations and negotiated wording on equivalent terms | [AIN-6](https://simeoncalixte1990.atlassian.net/browse/AIN-6) | [AIN-123](https://simeoncalixte1990.atlassian.net/browse/AIN-123) | [AIN-87](https://simeoncalixte1990.atlassian.net/browse/AIN-87), [AIN-95](https://simeoncalixte1990.atlassian.net/browse/AIN-95) |
| [AIN-109](https://simeoncalixte1990.atlassian.net/browse/AIN-109) Present a client recommendation and capture exact-terms approval | [AIN-6](https://simeoncalixte1990.atlassian.net/browse/AIN-6) | [AIN-26](https://simeoncalixte1990.atlassian.net/browse/AIN-26), [AIN-27](https://simeoncalixte1990.atlassian.net/browse/AIN-27) | [AIN-103](https://simeoncalixte1990.atlassian.net/browse/AIN-103), [AIN-102](https://simeoncalixte1990.atlassian.net/browse/AIN-102) |
| [AIN-113](https://simeoncalixte1990.atlassian.net/browse/AIN-113) Retrieve and deliver authoritative bound documents | [AIN-6](https://simeoncalixte1990.atlassian.net/browse/AIN-6) | [AIN-26](https://simeoncalixte1990.atlassian.net/browse/AIN-26) | [AIN-108](https://simeoncalixte1990.atlassian.net/browse/AIN-108), [AIN-109](https://simeoncalixte1990.atlassian.net/browse/AIN-109) |
| [AIN-114](https://simeoncalixte1990.atlassian.net/browse/AIN-114) Manage actual claims from intake through adjudication and reserves | [AIN-10](https://simeoncalixte1990.atlassian.net/browse/AIN-10) | [AIN-124](https://simeoncalixte1990.atlassian.net/browse/AIN-124) | [AIN-87](https://simeoncalixte1990.atlassian.net/browse/AIN-87), [AIN-108](https://simeoncalixte1990.atlassian.net/browse/AIN-108) |
| [AIN-118](https://simeoncalixte1990.atlassian.net/browse/AIN-118) Calculate and reconcile claims recoveries and beneficiary payments | [AIN-10](https://simeoncalixte1990.atlassian.net/browse/AIN-10) | [AIN-38](https://simeoncalixte1990.atlassian.net/browse/AIN-38), [AIN-39](https://simeoncalixte1990.atlassian.net/browse/AIN-39), [AIN-40](https://simeoncalixte1990.atlassian.net/browse/AIN-40), [AIN-29](https://simeoncalixte1990.atlassian.net/browse/AIN-29) | [AIN-114](https://simeoncalixte1990.atlassian.net/browse/AIN-114), [AIN-111](https://simeoncalixte1990.atlassian.net/browse/AIN-111), [AIN-90](https://simeoncalixte1990.atlassian.net/browse/AIN-90) |
| [AIN-89](https://simeoncalixte1990.atlassian.net/browse/AIN-89) Reconcile premium commission tax and fee obligations to receipts | [AIN-9](https://simeoncalixte1990.atlassian.net/browse/AIN-9) | [AIN-35](https://simeoncalixte1990.atlassian.net/browse/AIN-35), [AIN-37](https://simeoncalixte1990.atlassian.net/browse/AIN-37), [AIN-39](https://simeoncalixte1990.atlassian.net/browse/AIN-39) | None |
| [AIN-90](https://simeoncalixte1990.atlassian.net/browse/AIN-90) Verify funding collateral and reconciliation exceptions | [AIN-9](https://simeoncalixte1990.atlassian.net/browse/AIN-9) | [AIN-36](https://simeoncalixte1990.atlassian.net/browse/AIN-36), [AIN-35](https://simeoncalixte1990.atlassian.net/browse/AIN-35), [AIN-59](https://simeoncalixte1990.atlassian.net/browse/AIN-59), [AIN-29](https://simeoncalixte1990.atlassian.net/browse/AIN-29) | None |
| [AIN-104](https://simeoncalixte1990.atlassian.net/browse/AIN-104) Validate bordereaux and track contractual reporting obligations | [AIN-9](https://simeoncalixte1990.atlassian.net/browse/AIN-9) | [AIN-125](https://simeoncalixte1990.atlassian.net/browse/AIN-125) | [AIN-87](https://simeoncalixte1990.atlassian.net/browse/AIN-87), [AIN-95](https://simeoncalixte1990.atlassian.net/browse/AIN-95) |
| [AIN-115](https://simeoncalixte1990.atlassian.net/browse/AIN-115) Prepare renewals using reconciled experience and outstanding obligations | [AIN-86](https://simeoncalixte1990.atlassian.net/browse/AIN-86) | [AIN-126](https://simeoncalixte1990.atlassian.net/browse/AIN-126) | [AIN-96](https://simeoncalixte1990.atlassian.net/browse/AIN-96), [AIN-104](https://simeoncalixte1990.atlassian.net/browse/AIN-104), [AIN-110](https://simeoncalixte1990.atlassian.net/browse/AIN-110) |
| [AIN-91](https://simeoncalixte1990.atlassian.net/browse/AIN-91) Coordinate the client lifecycle in one authorized workspace | [AIN-86](https://simeoncalixte1990.atlassian.net/browse/AIN-86) | [AIN-127](https://simeoncalixte1990.atlassian.net/browse/AIN-127) | None |
| [AIN-110](https://simeoncalixte1990.atlassian.net/browse/AIN-110) Track market approaches responses and remaining placement work | [AIN-86](https://simeoncalixte1990.atlassian.net/browse/AIN-86) | [AIN-128](https://simeoncalixte1990.atlassian.net/browse/AIN-128) | [AIN-102](https://simeoncalixte1990.atlassian.net/browse/AIN-102), [AIN-88](https://simeoncalixte1990.atlassian.net/browse/AIN-88), [AIN-91](https://simeoncalixte1990.atlassian.net/browse/AIN-91) |
| [AIN-97](https://simeoncalixte1990.atlassian.net/browse/AIN-97) Turn permitted introductions into accountable commercial follow-up | [AIN-86](https://simeoncalixte1990.atlassian.net/browse/AIN-86) | [AIN-129](https://simeoncalixte1990.atlassian.net/browse/AIN-129) | [AIN-91](https://simeoncalixte1990.atlassian.net/browse/AIN-91) |
| [AIN-116](https://simeoncalixte1990.atlassian.net/browse/AIN-116) Reassign client work with a complete authorized handover | [AIN-86](https://simeoncalixte1990.atlassian.net/browse/AIN-86) | [AIN-130](https://simeoncalixte1990.atlassian.net/browse/AIN-130) | [AIN-91](https://simeoncalixte1990.atlassian.net/browse/AIN-91), [AIN-110](https://simeoncalixte1990.atlassian.net/browse/AIN-110) |
| [AIN-92](https://simeoncalixte1990.atlassian.net/browse/AIN-92) Review current counterparty evidence and transaction eligibility | [AIN-7](https://simeoncalixte1990.atlassian.net/browse/AIN-7) | [AIN-28](https://simeoncalixte1990.atlassian.net/browse/AIN-28), [AIN-29](https://simeoncalixte1990.atlassian.net/browse/AIN-29), [AIN-59](https://simeoncalixte1990.atlassian.net/browse/AIN-59) | None |
| [AIN-105](https://simeoncalixte1990.atlassian.net/browse/AIN-105) Review document-derived facultative and treaty terms as executable contracts | [AIN-6](https://simeoncalixte1990.atlassian.net/browse/AIN-6) | [AIN-50](https://simeoncalixte1990.atlassian.net/browse/AIN-50), [AIN-51](https://simeoncalixte1990.atlassian.net/browse/AIN-51) | [AIN-87](https://simeoncalixte1990.atlassian.net/browse/AIN-87), [AIN-95](https://simeoncalixte1990.atlassian.net/browse/AIN-95) |
| [AIN-111](https://simeoncalixte1990.atlassian.net/browse/AIN-111) Calculate multilayer protection and reinstatement effects from approved terms | [AIN-10](https://simeoncalixte1990.atlassian.net/browse/AIN-10) | [AIN-38](https://simeoncalixte1990.atlassian.net/browse/AIN-38), [AIN-23](https://simeoncalixte1990.atlassian.net/browse/AIN-23) | [AIN-105](https://simeoncalixte1990.atlassian.net/browse/AIN-105), [AIN-89](https://simeoncalixte1990.atlassian.net/browse/AIN-89) |
| [AIN-117](https://simeoncalixte1990.atlassian.net/browse/AIN-117) Compare stressed portfolio losses and retained protection | [AIN-4](https://simeoncalixte1990.atlassian.net/browse/AIN-4) | [AIN-23](https://simeoncalixte1990.atlassian.net/browse/AIN-23) | [AIN-101](https://simeoncalixte1990.atlassian.net/browse/AIN-101), [AIN-111](https://simeoncalixte1990.atlassian.net/browse/AIN-111), [AIN-100](https://simeoncalixte1990.atlassian.net/browse/AIN-100) |
| [AIN-120](https://simeoncalixte1990.atlassian.net/browse/AIN-120) Trace outward protection and changes to underlying exposures | [AIN-10](https://simeoncalixte1990.atlassian.net/browse/AIN-10) | [AIN-38](https://simeoncalixte1990.atlassian.net/browse/AIN-38), [AIN-40](https://simeoncalixte1990.atlassian.net/browse/AIN-40), [AIN-51](https://simeoncalixte1990.atlassian.net/browse/AIN-51) | [AIN-111](https://simeoncalixte1990.atlassian.net/browse/AIN-111), [AIN-112](https://simeoncalixte1990.atlassian.net/browse/AIN-112), [AIN-118](https://simeoncalixte1990.atlassian.net/browse/AIN-118) |
| [AIN-119](https://simeoncalixte1990.atlassian.net/browse/AIN-119) Synchronize policy claims and accounting records with recoverable handoffs | [AIN-1](https://simeoncalixte1990.atlassian.net/browse/AIN-1) | [AIN-52](https://simeoncalixte1990.atlassian.net/browse/AIN-52), [AIN-26](https://simeoncalixte1990.atlassian.net/browse/AIN-26), [AIN-54](https://simeoncalixte1990.atlassian.net/browse/AIN-54) | [AIN-108](https://simeoncalixte1990.atlassian.net/browse/AIN-108), [AIN-114](https://simeoncalixte1990.atlassian.net/browse/AIN-114), [AIN-89](https://simeoncalixte1990.atlassian.net/browse/AIN-89) |
| [AIN-93](https://simeoncalixte1990.atlassian.net/browse/AIN-93) Recover interrupted workflows and restore consistent business history | [AIN-1](https://simeoncalixte1990.atlassian.net/browse/AIN-1) | [AIN-14](https://simeoncalixte1990.atlassian.net/browse/AIN-14), [AIN-54](https://simeoncalixte1990.atlassian.net/browse/AIN-54), [AIN-55](https://simeoncalixte1990.atlassian.net/browse/AIN-55) | None |
| [AIN-94](https://simeoncalixte1990.atlassian.net/browse/AIN-94) Inspect reconciled management metrics with provenance and freshness | [AIN-9](https://simeoncalixte1990.atlassian.net/browse/AIN-9) | [AIN-17](https://simeoncalixte1990.atlassian.net/browse/AIN-17), [AIN-30](https://simeoncalixte1990.atlassian.net/browse/AIN-30), [AIN-31](https://simeoncalixte1990.atlassian.net/browse/AIN-31), [AIN-32](https://simeoncalixte1990.atlassian.net/browse/AIN-32), [AIN-35](https://simeoncalixte1990.atlassian.net/browse/AIN-35), [AIN-53](https://simeoncalixte1990.atlassian.net/browse/AIN-53) | None |
| [AIN-121](https://simeoncalixte1990.atlassian.net/browse/AIN-121) Demonstrate persona workflows and measure operational value in staging | [AIN-12](https://simeoncalixte1990.atlassian.net/browse/AIN-12) | [AIN-45](https://simeoncalixte1990.atlassian.net/browse/AIN-45), [AIN-46](https://simeoncalixte1990.atlassian.net/browse/AIN-46) | [AIN-87](https://simeoncalixte1990.atlassian.net/browse/AIN-87), [AIN-108](https://simeoncalixte1990.atlassian.net/browse/AIN-108), [AIN-113](https://simeoncalixte1990.atlassian.net/browse/AIN-113), [AIN-114](https://simeoncalixte1990.atlassian.net/browse/AIN-114), [AIN-118](https://simeoncalixte1990.atlassian.net/browse/AIN-118), [AIN-119](https://simeoncalixte1990.atlassian.net/browse/AIN-119), [AIN-93](https://simeoncalixte1990.atlassian.net/browse/AIN-93), [AIN-94](https://simeoncalixte1990.atlassian.net/browse/AIN-94), [AIN-115](https://simeoncalixte1990.atlassian.net/browse/AIN-115) |

## Scope and exclusions

- AIN-1–10/12 and AIN-47 retain broader release, finance and data-model obligations. The new stories supplement them; no parent was closed or scope removed.
- Completed AIN-33/34/52/61–78/81–85 are reusable capabilities/evidence, not new implementation claims. AIN-70/71/72 remain Done and are not reopened for unrelated client coordination.
- AIN-79/80 are reused and clarified rather than duplicated. AIN-30/31/32/35/36/37/38/39/40 retain domain financial implementation ownership.
- AIN-11 and AIN-41–44 subscription/checkout/metering work remains a release dependency where AIN-12 requires it, but is not duplicated as persona feedback work: none of the 60 points requests a new subscription workflow.
- Unrelated social feature expansion (messaging/uploads/public indexing), a second identity system, a second ledger, hard-coded forms for every risk class and automatic public appetite disclosure are excluded. They are not required to resolve this feedback.

## LLM-generated forms

Generated-form gate: preserve document-driven extensibility, evidence anchors, stable semantic/entity IDs, missing/conflicting states and human corrections; pin schema/catalog/generator versions, reject unsafe generated structures and prove regeneration/replay behavior. LLM output never independently grants authority, approves coverage, sets eligibility or posts money.

Generation produces a review candidate with evidence, semantic/entity bindings and pinned versions. Deterministic validation, human correction/reconciliation and explicit activation govern downstream use. New forms do not replace existing workflow scaffolding or service ownership. See EnsuredPipelineSchemaGeneration/README.md, EnsuredAPI/src/formCatalog/README.md and docs/submission-variability-plan/04-schema-generation.md.

## Definition of Done

1. All acceptance criteria and the story-specific verification scenario pass; link implementation tasks/PRs and record the reviewed source/package versions. A partial component or newly created ticket does not satisfy this story.
2. Every changed UI workflow has executable Storybook play functions asserting user actions, observable results and exact submitted payloads, including success, validation, failure/retry, empty/loading, pagination and permission/revocation states where applicable. Document a reason for any nonapplicable state. Include keyboard and narrow-screen checks.
3. Fixture stories use isolated synthetic transports with accidental application writes blocked. Also run authenticated real-service journeys against isolated Docker databases/services for authorization, durable state, concurrency, idempotency and relevant money invariants. Backend-only work uses integration evidence linked to this story, not artificial UI.
4. Attach ticket → component → Storybook story IDs → command/results mapping, regression evidence, API/database checks and known coverage gaps to Jira and TASK_HANDOFF.md. New failures have linked bug tickets and regressions; no unresolved failure of an acceptance criterion permits Done.
5. Reconcile all required dependencies and subtasks. Record migration/backfill compatibility and rollback results when schemas change. Demonstrate the workflow in the integrated staging environment, identifying deployed build and service versions; local checks alone are not staging evidence. Production deployment remains a separate release gate under AIN-1/12.
6. For external-system or monetary settlement claims, attach configured vendor/provider-sandbox evidence and matched reconciliation; simulated events or manually recorded receipts cannot establish external delivery or settled cash.

Each Jira story also contains outcome-specific acceptance criteria and a concrete verification scenario; the common gate is not a substitute for those criteria.

## Verification and release status

- Planning verification: source review, current Jira reconciliation, acyclic predecessor graph and complete 60-point coverage check. Jira creation/update descriptions and parents are read back; final verification checks story types, statuses, implementation links, dependency direction and subtasks.
- Application implementation, new Storybook/API tests, provider tests, migrations and deployment: **not performed**. New issues remain To Do. Existing statuses are preserved.
- Story execution evidence is explicitly pending; no test IDs/results or staged build IDs are fabricated. Future delivery must record ticket → component → executable Storybook story → command/result mapping.
- Existing fixture/live paths to extend include EnsuredMarketplace/src/Participation.stories.tsx, EnsuredMarketplace/src/Marketplace.stories.tsx, EnsuredNetwork/frontend/src/{Fixtures,PartyParticipation,Participation.live}.stories.tsx, EnsuredNetwork/test/participation-live.mjs, EnsuredUI/src/Pages/InsurerDashboard/sections/*.stories.tsx and commercial/claims host workflows. Fixture and real-service evidence remain separate.
- Original broader platform objective remains incomplete. This request is backlog creation only; next implementation step is to select the dependency-ready story and refresh its current Jira/source evidence.

## Artifacts

- `plan.json`: complete story content, criteria, DoD and feedback mapping.
- `baseline.json`: live pre-change Jira snapshot.
- `receipts.json`: created IDs, updates, links and read-back evidence.
- `build_plan.py`, `publish.py`, `write_map.py`: reproducible planning/publishing helpers; credentials are not stored in these artifacts. Publishing depends on the temporary environment-specific API helper and must not be blindly replayed.
