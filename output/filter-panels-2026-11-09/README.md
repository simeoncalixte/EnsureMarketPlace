# Standard right-hand filter panels

User scope: all application filter sections. Story AIN-162; sequential subtasks AIN-163 (shared panel), AIN-164 (consumer migration), AIN-165 (verification and local Docker delivery). AIN-166 tracks the pre-existing EmailInbox success-assertion typo found by regression testing.

The shared XDS `RightHandPanel` uses the submission overview's 420px surface, 80px header offset, theme tokens, responsive width and scrolling. The original submission sidebar now shares its surface primitive. Each filtering section opens in that panel. Existing draft/apply/reset, URL and transport behavior stays with its owning component. Search fields used to select entities while authoring records (counterparties, audience, team members, geographic rules) remain editor controls. Application navigation search, table column sorting, view navigation and active-filter summary chips are not separate filter sections.

## Ticket → component → interaction evidence

All consumer rows belong to AIN-164 / AIN-162; shared behavior belongs to AIN-163.

| Component | Story ID(s) |
| --- | --- |
| XDS RightHandPanel | `layout-righthandpanel--apply-reset-and-keyboard` |
| SubmissionFilterDrawer (dashboard widgets and submission board entry points) | `pages-filters-submissions--apply-and-reset`, `--validation`, `--failure-retry`, `--empty`, `--loading`, `--permission-denied` |
| MarketplaceFiltersSection | `marketplace-experience--taxonomy-interaction`; existing browse, loading, empty, error and handoff stories |
| Network discovery | `network-fixtures--discovery-filters`; existing fixture suite |
| FacilitiesPage | `pages-commercial-palette-regression--listing` |
| FacilityDocuments | `pages-commercial-palette-regression--documents`, `--document-permission` |
| FacilityApprovals | `pages-commercial-palette-regression--approvals` |
| FacilityRequestManager | `pages-commercial-palette-regression--requests` (including original exact decision payload) |
| CommercialActivity | `pages-commercial-palette-regression--activity` |
| RetrocessionDashboard | `pages-filters-commercial--treaty-search` |
| CommercialWorkspace shared-facility discovery | `pages-filters-commercial--shared-facility-search` (exact query parameters) |
| PartiesPage | `pages-parties-workflows--directory-search`; existing permission/pagination suite |
| FinancialPartiesPage | `pages-parties-workflows--financial-directory` |
| EmailInbox | `pages-insurer-dashboard-email-inbox--inbox-layout`, `--read-message` |
| ModelLibrary | `pages-settings-model-library--search-pagination`; existing permission/validation/loading/retry suite |
| SubmissionDocuments | `pages-insurer-dashboard-submission-documents--multiple-documents`; existing upload/process suite |
| LogisticsApp | `logistics-collaboration--search-and-filter`; existing collaboration/error/loading stories |

No API, authorization, accounting or persistence behavior changes. Synthetic transports block unexpected application writes; browser runners block external requests. These stories establish UI behavior, not new database or external-provider evidence. AIN-79 remains a separate, pre-existing obligation to make all Marketplace filter controls affect inventory: moving those controls does not complete that story. AIN-1/12 production/staging release criteria and unrelated linked tickets are excluded from this local UI delivery.

## Verification

`npm --prefix EnsuredXDS test` (13 package tests); lint/format; shared panel story at 375px and 1440px. Before release, candidate consumers were built in `/tmp/ensured-filter-check/` against isolated copies of the candidate XDS artifact. Running application installations were not altered for this testing.

`node scripts/verify-palette-stories.mjs` runs selected Storybook play functions using `STORYBOOK_ROOT`, `STORY_TITLES`, `STORY_WIDTH`, `STORY_LABEL` and `PALETTE_OUTPUT`. `node scripts/verify-filter-panels.mjs` additionally accepts `STORY_IDS` and verifies each opened panel's right edge and viewport containment. Result JSON and screenshots in this directory identify exact executed stories and outcomes. Historical first-pass host results include the AIN-166 test typo; final host results supersede that failure. Registry release and Docker receipts will be recorded separately when complete.

## Final delivery

AIN-162–167 are Done (fresh `jira-final.json`). All three approved package releases succeeded; exact source heads, Actions runs, registry integrity and container versions are in `runtime-release.json`. Final host registry build and owning package builds pass. 97 distinct interaction stories have passing evidence, including the final AIN-166 correction. Desktop/mobile shared-panel checks and 16 mobile panel geometry journeys passed. Firefox signed-in runtime verifies Marketplace and Network panels, real taxonomy, keyboard close and focus restoration.

The local frontend Docker image is refreshed; all checked service endpoints return 200. AIN-167 restored the existing API/database stack and corrected its watch command to include the internal-only database override. Existing data and the other project's database are preserved. Keep `--env-file EnsuredAPI/.env -f EnsuredAPI/docker-compose.yml -f output/model-settings-2026-11-05/internal-database.yml` on API/UI Compose and watch commands. No production deployment, manual migration or separate Logistics deployment. Host/Logistics edits remain local; approved package source releases are pushed/tagged.
