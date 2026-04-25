# Crowd Reinsurance Platform - Complete Routes & Subroutes

## Global Structure
```
/
├── /auth
├── /marketplace
├── /orders
├── /secondary-market
├── /notifications
├── /documents
├── /integrations
├── /reports
├── /treasury
├── /system
├── /organization
├── /investor
├── /insurer
├── /underwriting
├── /admin
├── /api
```

---

## Marketplace
```
/marketplace
├── /
├── /featured
├── /categories
├── /search
├── /filters
├── /:dealId
│   ├── /overview
│   ├── /orderbook
│   ├── /activity
│   ├── /pricing
│   ├── /liquidity
```

---

## Orders
```
/orders
├── /
├── /create
├── /pending
├── /filled
├── /cancelled
├── /:orderId
│   ├── /status
│   ├── /execution
│   ├── /history
```

---

## Secondary Market
```
/secondary-market
├── /
├── /listings
├── /my-listings
├── /trades
├── /:listingId
│   ├── /details
│   ├── /buy
```

---

## Notifications
```
/notifications
├── /
├── /unread
├── /settings
├── /:notificationId
```

---

## Documents
```
/documents
├── /
├── /agreements
├── /contracts
├── /spv
├── /:documentId
│   ├── /view
│   ├── /download
│   ├── /sign
```

---

## Integrations
```
/integrations
├── /webhooks
│   ├── /
│   ├── /create
│   ├── /:webhookId
├── /api-keys
├── /logs
```

---

## Reports
```
/reports
├── /investor
│   ├── /performance
│   ├── /tax
│   ├── /statements
├── /insurer
│   ├── /loss
│   ├── /coverage
```

---

## Treasury
```
/treasury
├── /accounts
├── /balances
├── /movements
├── /reconciliation
```

---

## System
```
/system
├── /status
├── /uptime
├── /incidents
├── /history
```

---

## Organization
```
/organization
├── /members
├── /roles
├── /permissions
├── /activity
```

---

## Underwriting
```
/underwriting
├── /dashboard
├── /queue
├── /activity
├── /submissions
├── /models
├── /scenarios
├── /pricing
├── /structures
├── /approvals
├── /assumptions
```

---

## Investor
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

## Insurer
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

## Admin
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

## API (High Level)
```
/api/auth
/api/investor
/api/insurer
/api/deals
/api/events
/api/ledger
/api/payouts
/api/underwriting
/api/orders
/api/marketplace
```

---

## Final Insight

This routing system now represents:
- Capital flow
- Risk flow
- Market flow
- Execution flow

It is a full financial infrastructure platform, not just an insurance tool.
