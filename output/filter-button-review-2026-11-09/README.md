# Filter-button placement review — 2026-11-09

Scope: review all migrated filter-trigger placements, create actionable Jira tickets with Before screenshots, and make Before/After evidence mandatory in AGENTS.md. This is review/planning evidence. No product placement fixes or After captures are claimed.

## Findings and required work

- Marketplace: default flex stretch leaves the trigger occupying the old sidebar column beside results. Place a compact trigger in the results action toolbar, preserving access in map and deal/table modes.
- Network: trigger is wedged between discovery hero and tabs on its own line. Integrate with the discovery toolbar and results context.
- Commercial: facilities/requests have detached triggers; approvals/treaties/shared facility discovery have desktop full-width triggers; audit filter/export lack a spaced action group. Normalize section toolbar placement.
- Parties and financial parties: desktop full-width standalone triggers should sit with directory actions.
- Logistics: trigger is detached below the Load board heading rather than grouped with its count/actions.

Reviewed exclusions: email inbox, submission documents, facility documents and model library already group their triggers within local toolbars/headings; no placement defect ticket added. Model library intentionally wraps at narrow width. Dashboard ResultsToolbar is the source reference for right-aligned section actions. Navigation search, form selectors and sorting are not filter sections.

AIN-162 is the completed panel migration, related rather than reopened. AIN-79 is effective Marketplace filtering and remains independently open; placement does not implement its inventory semantics. AIN-1 staging/rollback/provider obligations remain independent. Existing API projections and Auth gateway ownership are unaffected by these presentation-only tickets. No new endpoint, financial mandate or publication behavior is proposed.

## Evidence and reproducibility

`captures.json`: 30 successful fixture play executions (15 surfaces × desktop/narrow), measured trigger bounds and 60 Before image paths. Dark theme, Chromium, device scale 1, 100% zoom, viewports 1440×1000 and 375×1000. Scroll begins at 0,0; closed captures are full-page, open captures are viewport screenshots. Synthetic role/data come from the named fixture. Directory play functions enter details; capture navigates back using the directory links. Focus outlines are authentic keyboard state after Escape, not annotations. Dynamic dates may differ on rerun and must be disclosed in comparisons. External requests are aborted; no live application writes.

Build commands: `npm run build-storybook` in EnsuredUI, EnsuredMarketplace, EnsuredNetwork/frontend and EnsuredLogistics. Capture: `node scripts/review-filter-button-positions.mjs`; selective directory rerun: `REVIEW_SURFACES=parties,financial-parties node scripts/review-filter-button-positions.mjs`. All 30 capture runs report zero errors and successful existing play completion. These checks prove fixture interactions, not acceptable placement; the tickets require new layout regression assertions.

`source-provenance.json` records current heads and existing dirty paths. Fresh fixtures were built against installed registry dependencies; no new product edits were made for this review. Build logs: `/tmp/filter-position-{host,market,network,logistics}-build.log`. Capture log: `/tmp/filter-button-captures.log` (directory rerun printed directly). `jira-baseline.json` records fresh search; `jira-final.json` records created issues and attachment metadata. `tickets.json` maps every required issue and uploaded Before attachment, including SHA-256 and verified download status. Before images are attached to the owning subtasks; parent links all required work.

## Component → story mapping

| Surface | Component | Story ID |
|---|---|---|
| Marketplace | EnsuredMarketplace/src/Pages/Marketplace/Marketplace.sections.tsx | marketplace-experience--taxonomy-interaction |
| Network | EnsuredNetwork/frontend/src/Network.tsx | network-fixtures--discovery-filters |
| Logistics | EnsuredLogistics/app/logistics/LogisticsApp.tsx | logistics-collaboration--search-and-filter |
| Facilities | EnsuredUI/src/Pages/Commercial/FacilitiesPage.tsx | pages-commercial-palette-regression--listing |
| Approvals | EnsuredUI/src/Pages/Commercial/FacilityApprovals.tsx | pages-commercial-palette-regression--approvals |
| Audit | EnsuredUI/src/Pages/Commercial/CommercialActivity.tsx | pages-commercial-palette-regression--activity |
| Requests | EnsuredUI/src/Pages/Commercial/FacilityRequests.tsx | pages-commercial-palette-regression--requests |
| Treaties | EnsuredUI/src/Pages/Commercial/RetrocessionDashboard.tsx | pages-filters-commercial--treaty-search |
| Shared facility discovery | EnsuredUI/src/Pages/Commercial/CommercialWorkspace.tsx | pages-filters-commercial--shared-facility-search |
| Party directory | EnsuredUI/src/Pages/Parties/PartiesPage.tsx | pages-parties-workflows--directory-search |
| Financial directory | EnsuredUI/src/Pages/Parties/FinancialPartiesPage.tsx | pages-parties-workflows--financial-directory |

Remaining four reviewed fixture IDs and paths are in captures.json. Dashboard alignment was source-reviewed; no new dashboard screenshot claimed.

## Completion gate

All new tickets remain To Do. Implement in listed sequence, run executable layout and interaction regressions, attach matching After images to every owning ticket, compare Before → After with build/commit and results, verify Jira readability, then reconcile parent completion. Registry publication and local Docker integration are required for changed hosted packages; standalone Logistics status must be explicit. No production deployment or schema migration occurred. AGENTS.md now makes this evidence workflow mandatory for subsequent UI work.

## Jira ticket map

Parent: AIN-168 (To Do); related completed AIN-162; broader AIN-1 remains To Do.

- [AIN-169](https://simeoncalixte1990.atlassian.net/browse/AIN-169): Fix stretched Marketplace filter button and place it in results toolbar — To Do; 4 verified Before attachments; After pending.
- [AIN-170](https://simeoncalixte1990.atlassian.net/browse/AIN-170): Align Network discovery filters with the discovery results toolbar — To Do; 4 verified Before attachments; After pending.
- [AIN-171](https://simeoncalixte1990.atlassian.net/browse/AIN-171): Normalize commercial filter triggers in section action toolbars — To Do; 24 verified Before attachments; After pending.
- [AIN-172](https://simeoncalixte1990.atlassian.net/browse/AIN-172): Place party directory filters beside directory actions — To Do; 8 verified Before attachments; After pending.
- [AIN-173](https://simeoncalixte1990.atlassian.net/browse/AIN-173): Align load filters with the Logistics load-board heading — To Do; 4 verified Before attachments; After pending.
