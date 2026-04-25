# Crowd Reinsurance Platform - Routes & Subroutes (With Underwriting)

## Global Structure
```
/
├── /auth
├── /investor
├── /insurer
├── /underwriting
├── /admin
├── /api
```

---

## Underwriting Routes (Core Domain)
```
/underwriting
├── /dashboard
├── /queue
├── /activity

├── /submissions
│   ├── /
│   ├── /:submissionId
│       ├── /overview
│       ├── /data
│       ├── /validation
│       ├── /notes
│       ├── /status

├── /models
│   ├── /
│   ├── /:modelId
│       ├── /overview
│       ├── /parameters
│       ├── /runs
│       ├── /results

├── /scenarios
│   ├── /
│   ├── /:scenarioId
│       ├── /inputs
│       ├── /results
│       ├── /comparisons

├── /pricing
│   ├── /
│   ├── /:pricingId
│       ├── /inputs
│       ├── /assumptions
│       ├── /output
│       ├── /versioning

├── /structures
│   ├── /
│   ├── /:structureId
│       ├── /layers
│       ├── /tranches
│       ├── /returns
│       ├── /stress-tests

├── /approvals
│   ├── /pending
│   ├── /approved
│   ├── /rejected
│   ├── /:approvalId
│       ├── /review
│       ├── /comments
│       ├── /decision

├── /assumptions
    ├── /
    ├── /:assumptionSetId
        ├── /parameters
        ├── /history
        ├── /diff
```

---

## Investor Routes
```
/investor
├── /dashboard
├── /portfolio
├── /capital
├── /deals
├── /events
├── /ledger
├── /settings
```

---

## Insurer Routes
```
/insurer
├── /dashboard
├── /risk
├── /portfolio
├── /coverage
├── /coverage-active
├── /claims
├── /reports
├── /settings
```

---

## Admin Routes
```
/admin
├── /dashboard
├── /deals
├── /risk
├── /capital
├── /events
├── /payouts
├── /users
├── /audit
├── /settings
```

---

## API Routes (Abbreviated)
```
/api/auth
/api/investor
/api/insurer
/api/deals
/api/events
/api/ledger
/api/payouts
/api/underwriting
```

---

## Key Insight

Underwriting is now a **first-class system domain**, not hidden inside:
- insurer flows
- admin flows

It enables:
- auditability
- pricing control
- regulatory defensibility
