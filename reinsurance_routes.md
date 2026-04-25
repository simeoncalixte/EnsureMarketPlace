# Crowd Reinsurance Platform - Routes & Subroutes

## Global Structure
```
/
├── /auth
├── /investor
├── /insurer
├── /admin
├── /api
```

---

## Auth Routes
```
/auth
├── /login
├── /register
├── /logout
├── /forgot-password
├── /reset-password
├── /verify-email
├── /mfa
│   ├── /setup
│   ├── /verify
```

---

## Investor Routes
```
/investor
├── /dashboard
├── /portfolio
│   ├── /overview
│   ├── /performance
│   ├── /allocation
│   ├── /risk
│   ├── /history
├── /capital
│   ├── /deposit
│   ├── /withdraw
│   ├── /transactions
│   ├── /locked
│   ├── /available
├── /deals
│   ├── /
│   ├── /:dealId
│       ├── /overview
│       ├── /risk
│       ├── /financials
│       ├── /structure
│       ├── /events
│       ├── /invest
│       ├── /documents
├── /events
│   ├── /live
│   ├── /map
│   ├── /alerts
│   ├── /history
│   ├── /:eventId
├── /ledger
│   ├── /entries
│   ├── /statements
│   ├── /tax-documents
├── /settings
    ├── /profile
    ├── /security
    ├── /bank-accounts
    ├── /notifications
    ├── /preferences
```

---

## Insurer Routes
```
/insurer
├── /dashboard
├── /risk
│   ├── /upload
│   ├── /history
│   ├── /validation
│   ├── /datasets
│       ├── /:datasetId
│           ├── /preview
│           ├── /errors
│           ├── /metrics
├── /portfolio
│   ├── /overview
│   ├── /exposure
│   ├── /geography
│   ├── /loss-model
│   ├── /scenarios
├── /coverage
│   ├── /create
│   ├── /simulate
│   ├── /pricing
│   ├── /layers
│   ├── /quotes
│   ├── /:coverageId
│       ├── /overview
│       ├── /terms
│       ├── /documents
├── /coverage-active
│   ├── /
│   ├── /:coverageId
│       ├── /status
│       ├── /limits
│       ├── /events
│       ├── /claims
├── /claims
│   ├── /active
│   ├── /history
│   ├── /:claimId
│       ├── /details
│       ├── /calculation
│       ├── /payout
├── /reports
│   ├── /loss
│   ├── /coverage
│   ├── /financial
├── /settings
    ├── /organization
    ├── /users
    ├── /integrations
    ├── /api-keys
```

---

## Admin Routes
```
/admin
├── /dashboard
├── /deals
│   ├── /
│   ├── /create
│   ├── /:dealId
│       ├── /overview
│       ├── /risk
│       ├── /structure
│       ├── /capital
│       ├── /events
│       ├── /audit
│       ├── /approve
│       ├── /reject
├── /risk
│   ├── /models
│   ├── /parameters
│   ├── /simulations
│   ├── /runs
├── /capital
│   ├── /pools
│   ├── /allocations
│   ├── /liquidity
│   ├── /exposure
├── /events
│   ├── /live
│   ├── /ingestion
│   ├── /triggers
│   ├── /logs
│   ├── /:eventId
├── /payouts
│   ├── /pending
│   ├── /executed
│   ├── /failed
│   ├── /:payoutId
│       ├── /details
│       ├── /approve
│       ├── /retry
├── /users
│   ├── /investors
│   ├── /insurers
│   ├── /admins
│   ├── /:userId
│       ├── /profile
│       ├── /activity
│       ├── /permissions
├── /audit
│   ├── /logs
│   ├── /ledger
│   ├── /access
│   ├── /events
├── /settings
    ├── /general
    ├── /fees
    ├── /limits
    ├── /feature-flags
```

---

## API Routes
```
/api/auth
├── /login
├── /register
├── /refresh
├── /logout

/api/investor
├── /portfolio
├── /deals
├── /allocate
├── /withdraw
├── /transactions

/api/insurer
├── /upload
├── /portfolio
├── /coverage
├── /claims

/api/deals
├── /
├── /:dealId
├── /:dealId/invest
├── /:dealId/events

/api/events
├── /live
├── /ingest
├── /trigger

/api/ledger
├── /entries
├── /balances
├── /reconcile

/api/payouts
├── /execute
├── /status
```
