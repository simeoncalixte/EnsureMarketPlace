# Total Capacity — How it's calculated

**Overview**

"Total Capacity" (shown as "Live Capital Exposure" / "Total Capacity" in the Insurer Dashboard) is computed on the backend and returned by the endpoint:

- `GET /api/marketplace/summary/capital-exposure`

The value displayed in the UI is `totalAvailable` from that endpoint (i.e., the remaining capital that can be allocated across active tranches).

---

## Algorithm (implementation summary)

1. Select tranches that belong to active deals. Active deal statuses are:
   - `approved`, `fundraising`, `active`.

2. For each tranche, compute the tranche capacity (the amount of capital the tranche requires):
   - If `tranche.capitalRequired` is present and numeric, use it.
   - Otherwise, fall back to `layerMax - layerMin` (the tranche layer width).
   - Values are parsed with a helper that converts DB DECIMAL/string values to Number (invalid / NaN → 0).

3. For each tranche, compute funded/committed capital:
   - `fundedAmount` = sum of `subscription.committedAmount` for subscriptions associated with that tranche. (The current endpoint sums all `committedAmount` values attached to the tranche.)

4. Aggregate across all included tranches:
   - `totalCapitalRequired = sum(trancheCapacity)`
   - `totalCommitted = sum(fundedAmount)`
   - `totalAvailable = max(0, totalCapitalRequired - totalCommitted)`

5. The endpoint returns JSON with the three numbers:
   - `{ totalCapitalRequired, totalCommitted, totalAvailable }`

---

## Data and units

- Amounts are monetary values stored in the DB as DECIMAL (strings in Sequelize). The backend converts them to Numbers before arithmetic.
- All values are treated as platform currency (USD in the UI formatting). No currency conversion is performed by this endpoint.

---

## Frontend mapping

- The Insurer Dashboard polls the backend endpoint (every 30s by default) and displays `totalAvailable` as the "Live Capital Exposure" number.
- The UI formats the number for display using `Intl.NumberFormat` (USD formatting in the current code).

Relevant files:
- [EnsuredAPI/src/routes/marketplace.ts](EnsuredAPI/src/routes/marketplace.ts) — endpoint implementation
- [EnsuredUI/src/Pages/InsurerDashboard/InsurerDashboard.tsx](EnsuredUI/src/Pages/InsurerDashboard/InsurerDashboard.tsx) — UI polling and display

---

## Example

- Tranche A capacity: `700,000,000`
- Tranche B capacity: `250,000,000`
- `totalCapitalRequired = 950,000,000`

If `totalCommitted = 100,000,000` then:

- `totalAvailable = 950,000,000 - 100,000,000 = 850,000,000`

---

## Caveats & suggested improvements

- Subscription filtering: the current backend sum includes all `committedAmount` values attached to a tranche. You may want to restrict to "open" or "active" subscription statuses (e.g., `committed`, `pending`, `partially_filled`) to avoid counting cancelled/closed commitments.
- Per-scope breakdowns: consider adding optional query params to the endpoint to return per-deal, per-SPV, or per-tranche breakdowns so UIs can show granularity instead of only the global aggregate.
- Real-time updates: for low-latency UIs use a websocket or server-sent events stream rather than polling.
- Exposure vs capacity: if you want the exposure to reflect underlying policy exposure units (policy/exposure aggregation) instead of tranche structural capacity, augment the calculation to incorporate `Policy` / `ExposureUnit` totals.

---

## Quick verification

From your machine (adjust port/API base as needed):

```bash
curl http://localhost:PORT/api/marketplace/summary/capital-exposure
```

This will return the JSON object with `totalCapitalRequired`, `totalCommitted`, and `totalAvailable`.

---

If you want, I can:
- Add per-deal or per-SPV breakdown fields to the endpoint.
- Filter subscriptions by status before summing `committedAmount`.
- Add a refresh button in the UI for immediate updates.
