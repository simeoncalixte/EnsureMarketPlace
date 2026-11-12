# AIN-168 — filter toolbar delivery

Final Jira read-back: AIN-168 and AIN-169–173 Done; AIN-1/AIN-79 remain To Do. See `jira-final.json`.

Objective: complete predictable filter-trigger placement across all five required subtasks, preserving the shared right-hand panel. Jira scope was refreshed before implementation (`jira-baseline.json`). Work proceeded AIN-169 → 170 → 171 → 172 → 173, verifying each local slice before the next; final integrated gates precede Done.

## Ticket and evidence map

All placement stories execute at 1440×1000 and 375×1000. Every trigger is compact, right-aligned in its section action group, at least 44px tall, within the viewport, with panel open/Escape/focus checks. Existing search/reset and observable-result assertions remain; new exact query assertions cover Network and party directories. Shared facility and approval-action payload assertions remain.

| Ticket | Component(s) | Story IDs | Before → After attachments |
|---|---|---|---|
| AIN-169 | Marketplace.tsx, Marketplace.sections.tsx, Marketplace.styles.tsx | marketplace-experience--taxonomy-interaction | 10000–10003 → 10044–10047 |
| AIN-170 | EnsuredNetwork/frontend/src/Network.tsx, styles.css | network-fixtures--discovery-filters | 10004–10007 → 10048–10051 |
| AIN-171 | EnsuredUI commercial FacilitiesPage, FacilityApprovals, CommercialActivity, FacilityRequests, RetrocessionDashboard, CommercialWorkspace | pages-commercial-palette-regression--listing, --approvals, --activity, --requests; pages-filters-commercial--treaty-search, --shared-facility-search | 10008–10031 → 10052–10075 |
| AIN-172 | EnsuredUI PartiesPage, FinancialPartiesPage | pages-parties-workflows--directory-search, --financial-directory | 10032–10039 → 10076–10083 |
| AIN-173 | EnsuredLogistics/app/logistics/LogisticsApp.tsx, app/globals.css | logistics-collaboration--search-and-filter | 10040–10043 → 10084–10087 |

The host shares `src/components/SectionToolbar/index.tsx` and a fixture interaction helper. The original Before files are retained in `output/filter-button-review-2026-11-09`. `all-attachments-readback.json` is authoritative for every exact filename/ID/hash: 44 Before + 44 After PNGs downloaded from Jira and verified against local bytes. `AIN-169-attachments.json` through `AIN-173-attachments.json` contain per-ticket After receipts. `captures.json` contains all 22 placement runs and trigger bounds with zero errors.

Before → After: Marketplace no longer reserves a stretched sidebar column, and map view now exposes filters. Network groups filters with discovery categories. Commercial triggers occupy labeled result toolbars; audit export and request refresh share the action group. Party filters sit beside directory refresh actions. Logistics groups the filter with load-board count/context. Narrow layouts wrap without overlapping or overflowing; focus rings remain visible.

Capture conditions: Chromium, dark theme, 100% zoom, device scale 1, 1440×1000 and 375×1000; synthetic story roles/data, scroll starts 0,0. Run play, Escape to closed state, then open trigger. Closed image is full-page; open image is viewport-only. Party stories return to their directory before capture. Audit timestamps and derived event digest differ with capture time; Logistics generated fixture references can differ. These are disclosed synthetic-data differences, not production evidence. Screenshots were visually reviewed alongside executable geometry checks. Final request retry correction changes only loading/error behavior; all four populated request captures were recaptured and match the attached PNGs byte-for-byte (`final-capture-comparison.json`). Network test-only follow-up was also recaptured: three identical PNGs and one visually matching desktop closed raster.

## Scope exclusions and behavior applicability

AIN-162 is completed related panel migration, not reopened. AIN-79 effective Marketplace inventory filtering remains independent and To Do: taxonomy search filters taxonomy choices; existing inventory controls do not submit inventory-filter payloads. This work does not claim otherwise. AIN-1 staging, rollback, provider and wider release obligations remain open. Email, facility/submission documents and model library already have appropriate placement; their narrow-screen interaction regressions pass. Navigation search, sort controls and authoring form inputs are excluded.

No API, financial authority, persistence, concurrency or schema behavior changed. Real local HTTP routes and panel access are verified, while existing backend authorization/accounting obligations remain owned by their original tickets. Fixture writes are synthetic transports; external application requests are blocked. Local runtime tests use existing synthetic demo accounts and block browser mutations. Frontend read-only filter changes introduce no write payload; existing request approval payload tests remain exact. Pagination/empty/loading/error/permission/revocation coverage is retained in the owning suites. New request failure/retry regression prevents a toolbar move from hiding Refresh after a failed read. No new product workflow or separate backend integration contract was introduced.

## Verification

- Marketplace: typecheck + package build; all 17 interaction tests pass; placement story passes both widths.
- Network: package build; all 14 fixture regression tests pass; discovery placement passes both widths; strengthened exact search-query story passes. Release runtime source is 377d006; test-only follow-up is 1845573.
- Host: final production build passes. Final commercial narrow suite 11/11; all party workflows 33/33; four explicit placement exclusions pass. Request failure/retry story also passes at 1440px.
- Logistics: typecheck and Storybook build pass; all six interaction/WebMCP tests pass; placement story passes both widths.
- Integrated local runtime: `runtime-journeys.json` records 20 successful read-only checks across ten hosted surfaces × two widths, with compact trigger geometry, toolbar association, panel access, Escape/focus and no document overflow. The initial request-inbox check was repaired to await tabs and use the existing synthetic owner account; final run passes. No application writes made.
- `registry-packages.json`: published registry URLs/integrities. Package override checker passes; running container reports Marketplace and Network 0.1.4.

Commands (run from root unless noted):

```sh
npm --prefix EnsuredMarketplace run typecheck
npm --prefix EnsuredMarketplace run build
npm --prefix EnsuredMarketplace run build-storybook
npm --prefix EnsuredMarketplace run test:interactions
npm --prefix EnsuredNetwork/frontend run build
npm --prefix EnsuredNetwork/frontend run build-storybook
npm --prefix EnsuredNetwork/frontend run test:fixtures
npm --prefix EnsuredUI run build-storybook
npm --prefix EnsuredUI run build
npm --prefix EnsuredLogistics run typecheck
npm --prefix EnsuredLogistics run build-storybook
npm --prefix EnsuredLogistics run test:interactions
REVIEW_OUTPUT=output/filter-button-delivery-2026-11-09 REVIEW_PHASE=after REVIEW_SURFACES=marketplace,network,facilities,approvals,activity,requests,treaties,facility-discovery,parties,financial-parties,logistics node scripts/review-filter-button-positions.mjs
STORYBOOK_ROOT=EnsuredUI/storybook-static STORY_TITLES='Pages/Commercial/Palette regression|Pages/Filters/Commercial' STORY_LABEL=commercial-final PALETTE_OUTPUT=output/filter-button-delivery-2026-11-09 node scripts/verify-filter-panels.mjs
STORYBOOK_ROOT=EnsuredUI/storybook-static STORY_TITLES='Pages/Parties/Workflows' STORY_LABEL=parties PALETTE_OUTPUT=output/filter-button-delivery-2026-11-09 node scripts/verify-filter-panels.mjs
node scripts/check-package-overrides.mjs
node scripts/verify-filter-toolbar-runtime.mjs
```

Machine-readable host regression results are `results-*.json`. Test logs are copied into `verification/`. Source heads and SHA-256 hashes for local host/Logistics files are in `source-provenance.json`; unrelated pre-existing modifications are preserved. Full host TypeScript cleanup is outside scope; production build and executable affected stories are the gates used here.

## Publication, integration and remaining boundaries

Marketplace 0.1.4: source `88aaa8559a2516a078f3497dcea39f248d34803f`, successful Actions 42681658369. Network 0.1.4: source `377d0062d9fa6bcf8d69c6ff6bf7d487ed026e1c`, successful Actions 42681915799. Both release tags/branches are pushed. Host consumes exact registry releases with recorded integrity, no local overrides. Host and Logistics source remains local among existing working-tree changes; source hashes identify the verified files.

Local frontend rebuilt and rerun using `docker compose --env-file EnsuredAPI/.env -f EnsuredAPI/docker-compose.yml -f output/model-settings-2026-11-05/internal-database.yml build frontend` then `up -d --no-deps --force-recreate --wait frontend`. Existing BuildKit secret supplied in process memory; no credentials in artifacts. Database volumes and other services retained. No schema migration, production or staging deployment. Logistics is standalone source/fixture verified, not deployed. This meets AIN-168's bounded local delivery gate; broader AIN-1 and AIN-79 outcomes remain incomplete.
