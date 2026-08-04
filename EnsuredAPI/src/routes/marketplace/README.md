# `marketplace` route

The marketplace surface: line-of-business / peril taxonomy reads, insured-subject
and generalized risk-class page-template authoring (+ immutable schema
versioning), the risk-class registry declaration, benchmark-prior credibility
anchors, and the deal/opportunity lifecycle.

## Endpoints

| Method & path | Purpose |
| ------------- | ------- |
| `GET /marketplace/line-of-business-taxonomy` | LOB primary/subtype taxonomy + resolved insured-subjects page template. |
| `GET /marketplace/peril-taxonomy` | Canonical peril (cause-of-loss) taxonomy grouped by category. |
| `GET /marketplace/submissions/:submissionId/cat-risk-assessments` | List CAT assessments attached to a submission. |
| `POST /marketplace/submissions/:submissionId/cat-risk-assessments` | Create a CAT assessment with peril-level scores for a submission. |
| `PUT /marketplace/insured-subjects/page-template` | Save the insured-subject page template JSONB. |
| `POST /marketplace/insured-subjects/page-template/fields` | Add a field to a template section and persist. |
| `DELETE /marketplace/insured-subjects/page-template/fields` | Remove a field from a template section and persist. |
| `GET /marketplace/risk-classes/:lob/schema` | Active draft/published schema template for an org + risk class. |
| `POST /marketplace/risk-classes/:lob/schema` | Create/replace the draft schema template. |
| `POST /marketplace/risk-classes/:lob/schema/fields` | Add a field to a risk-class schema section. |
| `DELETE /marketplace/risk-classes/:lob/schema/fields` | Remove a field from a risk-class schema section. |
| `POST /marketplace/risk-classes/:lob/schema/publish` | Compile the draft into an immutable schema version. |
| `GET /marketplace/risk-classes/:lob/schema/versions` | List published schema versions (audit history). |
| `GET /marketplace/risk-classes/:lob/schema/versions/:v` | Fetch a frozen schema version. |
| `GET /marketplace/risk-classes/:lob/registry` | Risk-class registry declaration (or resolved default). |
| `PUT /marketplace/risk-classes/:lob/registry` | Upsert the org's registry declaration. |
| `GET /marketplace/benchmark-priors/coverage` | Benchmark-prior coverage across the primary taxonomy lines. |
| `GET /marketplace/benchmark-priors/:lob` | Resolved benchmark prior for an org + risk class. |
| `PUT /marketplace/benchmark-priors/:lob` | Upsert the org's benchmark prior. |
| `GET /marketplace/opportunities/active-pending-funding` | Active deal tranches still below required capital. |
| `GET /marketplace/summary/capital-exposure` | Aggregate capital exposure across active deals. |
| `GET /marketplace/metrics/capital-exposure` | Capital-exposure time series. |
| `POST /marketplace/deals` | Create a deal (+ optional tranches, auto-SPV, subject snapshots). |

### CAT filter query params on opportunities

`GET /marketplace/opportunities/active-pending-funding` additionally accepts:

- `catPeril`: comma-separated CAT peril codes.
- `catBand`: comma-separated CAT bands.
- `catModelVersion`: comma-separated model versions.
- `catRecommendedAction`: comma-separated underwriting actions.
- `catScoreMin`: numeric lower bound for CAT score value.
- `catScoreMax`: numeric upper bound for CAT score value.

Filtering is applied against CAT scores linked to the deal's `submissionId`.

`:lob` accepts `primaryCode` or `primaryCode/subTypeCode` (slash URL-encoded),
resolved against the LOB taxonomy so labels/aliases also work.

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | Fastify plugin wiring + public export (`marketplaceRoute`); registers the handler sub-plugins in declaration order. |
| `schemas.ts` | Shared Fastify JSON schema objects (the `pageTemplate*` family). |
| `types.ts` | Local interfaces/types (opportunity, tranche relations, taxonomy nodes, template-resolution shapes). |
| `pageTemplates.service.ts` | Insured-subject + generalized risk-class template helpers (resolve/upsert/field ops, LOB-selection + `:lob` parsing). |
| `taxonomy.service.ts` | LOB / peril taxonomy loaders with seed-data fallbacks. |
| `deals.service.ts` | Deal/opportunity helpers (status sets, LOB derivation, subject-record builder, numeric helpers). |
| `catScores.service.ts` | CAT assessment persistence + CAT filter parsing/matching + CAT option resolvers. |
| `handlers.catScores.ts` | Submission-scoped CAT assessment read/write endpoints. |
| `handlers.taxonomy.ts` | Taxonomy reads + insured-subjects page-template authoring routes. |
| `handlers.riskClasses.ts` | Risk-class schema/versioning, registry, and benchmark-prior routes. |
| `handlers.deals.ts` | Opportunities, capital-exposure summary/metrics, and deal creation routes. |
| `marketplace.test.ts` | Integration coverage (taxonomy, template persistence, opportunities, deal creation). |

## Related

- `../../db/models` + `../../db/models/{capital,pageTemplates,riskClassSchema,riskClassRegistry,benchmarkPrior}.models` — backing models.
- `../../db/seed-data/{pageTemplates,lineOfBusinessTaxonomy,perilTaxonomy}` — fallback seed definitions.
- `../../pipeline/{schema/publish,registry/*,benchmarkPriors/*}` — schema publish, registry/prior resolve + upsert, coverage.
- `../../lib/org` — `resolveOrganizationIdFromRequest`.
- `../reinsuranceSeed` — sibling route used by the test to seed deals/tranches.
- Registered in `../../app.ts` as `marketplaceRoute` under the `/api` prefix.
