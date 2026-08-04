# Filters: Backend Targeting and Frontend Configuration (Draft)

Purpose
-------
This document defines how filter configuration JSON is authored, targeted and resolved on the backend, and how the frontend consumes and processes that configuration to render the dynamic, data-driven filter UI.

Overview
--------
- Filter UI is driven by a declarative JSON config ("filter config").
- The backend stores and serves the canonical configs and resolves them for specific targets (tenant/org/env/role/etc.).
- The backend may optionally assemble a manifest that combines the config with preloaded option data.
- The frontend receives the config or manifest and renders controls via a `FilterRenderer` component which maps field types to UI controls.

Terminology
-----------
- config: The declarative JSON describing sections and fields.
- manifest: A server-assembled payload containing the config plus preloaded runtime data (options, min/max, counts).
- target: The context for which a config should apply (tenant, org, environment, role, market, etc.).
- provider: A backend function/service that returns runtime data for a field (list of options, range bounds, counts).

1. JSON config schema (example)
-------------------------------
A short, practical schema excerpt (human-readable):

```json
{
  "version": "1.0",
  "targeting": { "scope": "global" },
  "sections": [
    {
      "id": "exposure",
      "title": "Exposure",
      "icon": "stacked_line_chart",
      "color": "primary",
      "fields": [
        { "id": "lob", "type": "multiselect", "label": "Line of business", "optionsSource": "primaryTypes" },
        { "id": "peril", "type": "multiselect", "label": "Peril", "optionsSource": "perils" },
        { "id": "geography", "type": "text", "label": "Geography", "uiProps": { "autocomplete": "region" } },
        { "id": "tiv", "type": "minmax", "label": "TIV ($ range)" }
      ]
    }
  ]
}
```

Notes:
- `optionsSource` is a logical key the backend or frontend uses to obtain option lists. It can map to a static list embedded in the config, or to a backend provider name. Where a config needs to target a specific database table/fields, prefer mapping a logical `optionsSource` to a server-side provider (recommended) so the server controls which table/columns are queried.
- `uiProps` contains presentation details (placeholders, step, min/max hints).

2.3.1 Declarative `dataSource` (optional)
- For some simple, well-scoped fields the config may include a declarative `dataSource` object that describes a safe mapping to a data table or other backend source. This is intended for vetted, whitelist-backed lookups only — the server must validate and canonicalize any `dataSource` before executing queries.
- Example field using `dataSource`:

```json
{
  "id": "account",
  "type": "multiselect",
  "label": "Account",
  "dataSource": {
    "type": "db",
    "table": "accounts",
    "valueField": "id",
    "labelField": "name",
    "where": { "tenant_id": "{tenantId}" },
    "limit": 200,
    "orderBy": "name"
  }
}
```

- Server responsibilities when a `dataSource` is present:
  - Validate and canonicalize the `dataSource` object (type, allowed tables, allowed fields).
  - Map logical `optionsSource` keys to provider implementations or to an internal whitelist of `dataSource` mappings rather than executing arbitrary SQL from configuration authors.
  - Render parameterized queries using only safe, whitelisted bindings (never interpolate untrusted strings directly into SQL).
  - Enforce permission filtering (tenant scoping, user roles) and caching as appropriate.

- Server-side mapping pattern (pseudocode):

```ts
const dataSourceMap = {
  primaryTypes: { type: 'db', table: 'lob_types', valueField: 'code', labelField: 'display_name' },
  accounts: { type: 'db', table: 'accounts', valueField: 'id', labelField: 'name' }
};

async function resolveDataSource(keyOrSpec, ctx) {
  const spec = typeof keyOrSpec === 'string' ? dataSourceMap[keyOrSpec] : keyOrSpec;
  if (!spec || !isAllowedTable(spec.table)) throw new Error('disallowed data source');
  const where = renderWhere(spec.where || {}, ctx);
  return db.select(spec.valueField, spec.labelField).from(spec.table).where(where).orderBy(spec.orderBy || spec.labelField).limit(spec.limit || 200);
}
```

- Security note: prefer `optionsSource` → `providerRegistry` mappings for most cases. Use `dataSource` only for simple, vetted scenarios where the server maintains a whitelist of allowed tables/fields. Never accept arbitrary table names or SQL from untrusted authors.

2.3.2 AI / Human options (existing `schema_option_sets` model)
- The codebase already persists agent- and human-provided choice lists using the `schema_option_sets` / `schema_option_set_items` models (see `src/db/models/schemaOptionSets.models.ts`). The tenant-overlay resolution and editing primitives live in `src/services/FieldOptionsService.ts`.

- Key behavior (overlay model):
  - Global default sets (organizationId=null) contain AI- or system-generated baseline options.
  - An organization-scoped overlay stores only deltas (tenant-added items and a `hiddenValues` list of suppressed globals).
  - Human-added items are stored with `source: 'human'`; AI baselines use `source: 'ai'`.
  - Removing an AI baseline hides it for the tenant (overlay), whereas removing a human-added tenant item deletes it outright.

- What `FieldOptionsService.resolve(organizationId, optionSetKey)` returns:
  - `items`: visible `{value,label}` rows for rendering (global without hidden + tenant items).
  - `allItems`: every known item with metadata `{value,label,scope,hidden,source}` so admin UIs can show provenance and hidden state.

- Integration guidance (manifest/provider):
  - When assembling the manifest the server should call the same resolution path the UI uses. Example:

```ts
const fieldOptionsSvc = new FieldOptionsService();
const resolved = await fieldOptionsSvc.resolve(organizationId, optionsSourceKey);
// include resolved.items in the manifest under data[optionsSourceKey]
```

  - The `optionSetKey` used by schema generation and the `optionsSource` in the filter config should be the same logical key so the FieldOptionsService can resolve tenant overlays.

- Provenance and admin workflows:
  - `allItems` includes `source` ('ai'|'human') and `hidden` which the frontend can surface as badges or moderation UI.
  - Item creation/removal/approval is handled by `FieldOptionsService.addItem` / `removeItem` / `setHidden` which already implement copy-on-write semantics and hide-vs-delete rules.

- Operational notes:
  - Cache manifests, but invalidate on changes to `schema_option_sets` / `schema_option_set_items` or bump a manifest `meta.cacheKey`.

2. Backend responsibilities
--------------------------
2.1 Storage and authoring
- Store configs in a source-controlled repo (recommended) or a database/config service.
- Each config should include `version` and `schemaVersion`.
- Admins edit configs via a protected UI or CI-driven config repo.

2.2 Targeting & resolution
- Configs can include `targeting` constraints: e.g.
  - tenantId, orgId, environment (dev/stage/prod), market, userRoles
- Resolution algorithm (server-side):
  1. Collect all candidate configs matching the requested target (global, env, tenant, org).
  2. Apply deterministic merge rules: global <- env <- tenant <- org; later entries override earlier keys.
  3. Validate merged config against JSON schema.

2.3 Provider registry
- The backend maintains a registry mapping `optionsSource` keys to provider functions:
  - Example: `primaryTypes` -> providerPrimaryTypes(reqContext) returns [{value,label}, ...]
  - Providers can accept parameters: tenantId, region, search, pagination.
- Providers run queries against DB, search indices, or other microservices to produce option lists, counts, min/max.

2.4 Manifest generation (recommended)
- For the initial page load, the backend can return a manifest that contains:
  - `config`: the resolved JSON config
  - `data`: a dictionary of provider outputs keyed by `optionsSource`
  - `meta`: version, cacheKeys, timestamp
- Endpoint example: `GET /api/filters/manifest?target=marketplace&tenant=acme` returns the manifest.
- Benefits: fewer round trips, server can enforce permission filter logic, and consistent ordering.

2.5 Validation, versioning and auditing
- Use a JSON Schema to validate config at write-time. Reject or mark invalid changes.
- Record audit trail for config changes (who, when, diff).
- Support config versioning and a rollback path.

2.6 Security & authorization
- Only authorized users (admins/operators) may modify configs.
- Provider outputs should be filtered based on viewer permissions if necessary.

3. Frontend responsibilities
----------------------------
3.1 Modes of operation
- Manifest-first: frontend requests `GET /api/filters/manifest?...` and receives config + preloaded data. Use preloaded data directly.
- Config-only: frontend requests `GET /api/filters/config?...` and then requests provider endpoints on demand (e.g., search-as-you-type for multiselects).

3.2 `FilterRenderer` (core idea)
- Props: `config`, `dataSources` (preloaded provider outputs), `runtimeContext` (tenantId, roles), `onChange` callbacks.
- For each `section` in `config.sections`, render a collapsible section component.
- For each `field`:
  - Map `type` to control component:
    - `multiselect` -> existing `MultiSelect`
    - `minmax` -> two inputs or range pair
    - `range` -> slider
    - `text` -> `Input` (with autocomplete hooks)
    - `date` -> date picker
    - `custom` -> render a provided React node
  - Resolve options for a field using, in order of preference:
    1. `dataSources[field.optionsSource]` (manifest-provided)
    2. `field.options` (static list embedded in config)
    3. `field.optionsUrl` template (frontend should fetch)
    4. Fallback to empty list

3.3 Dynamic option fetching
- For searchable multiselects, the frontend should call either:
  - `GET /api/providers/{optionsSource}?q=<search>&tenant=<t>`  (server provider endpoint)
  - Or a dedicated endpoint surfaced in `field.optionsUrl` with templating placeholders (e.g., `{q}`, `{tenant}`).
- Debounce search input; cache results by query.

3.4 State handling & serialization
- Maintain a central `filtersState: Record<string, any>` keyed by `field.id`.
- `onFieldChange(id, value)` updates `filtersState` and recomputes `sectionActive` counts.
- Provide serialization helpers to encode/decode `filtersState` to/from query string or saved presets.

3.5 Custom fields
- Support `field.type === 'custom'` where the config contains `field.componentKey` that maps to a registered React component on the frontend. This allows gradual migration of bespoke UI.

3.6 UX considerations
- Display `Soon` tags for fields not yet wired.
- Show counts/available hints when provider returns counts.
- Use server-provided ordering and grouping when available.

4. Example manifest (server response)
------------------------------------
```json
{
  "meta": { "configVersion": "1.0", "timestamp": "2026-07-05T12:00:00Z" },
  "config": { /* resolved config JSON shown earlier */ },
  "data": {
    "primaryTypes": [{"value":"property","label":"Property"}, {"value":"casualty","label":"Casualty"}],
    "perils": [{"value":"flood","label":"Flood"}, {"value":"wind","label":"Wind"}]
  }
}
```

Notes:
- The manifest allows the frontend to avoid fetching `perils` or `primaryTypes` separately.

5. Provider API examples
------------------------
- Manifest endpoint (server resolves config + provider outputs):
  - `GET /api/filters/manifest?target=marketplace&tenant=acme`
- Provider endpoint (on-demand):
  - `GET /api/providers/perils?q=tamp&limit=20&tenant=acme`

6. Server-side pseudocode (resolve manifest)
-------------------------------------------
```ts
async function getFiltersManifest({ target, tenantId, user }) {
  const candidates = await configStore.findConfigsForTarget(target, tenantId);
  const merged = mergeConfigs(candidates); // global <- env <- tenant
  validate(merged, filterJsonSchema);

  // determine which providers to invoke (server may skip heavy providers)
  const providerKeys = collectProviderKeys(merged);
  const data = {};
  for (const key of providerKeys) {
    const provider = providerRegistry.get(key);
    data[key] = await provider({ tenantId, target, user, preview: true });
  }
  return { meta: { version: merged.version }, config: merged, data };
}
```

7. Frontend pseudocode (use manifest)
-------------------------------------
```tsx
// on page load
const manifest = await fetch('/api/filters/manifest?target=marketplace&tenant=acme').then(r=>r.json());
<FilterRenderer config={manifest.config} preloadedData={manifest.data} onChange={handleChange} />
```

8. Migration approach (incremental)
-----------------------------------
1. Implement the backend manifest endpoint that returns the current (resolved) config plus provider outputs.
2. Create `FilterRenderer` and a local `filters.config.json` matching the current UI for one section (Exposure).
3. Switch `MarketplaceFilterDock` to use `FilterRenderer` for that section only (keep existing `ExposureSection` as fallback).
4. Gradually port additional sections to config-driven definitions.
5. Add support for `custom` fields and `componentKey` to preserve bespoke UI.

9. Operational notes
--------------------
- Cache manifests aggressively at CDN level but use short TTL when configs are frequent-changes; invalidate on config edits.
- Use feature flags to gate rollout.
- Provide admin UI for previewing target-resolved config.

Appendix: Sample field config keys
---------------------------------
- `id` (string)
- `type` (multiselect|minmax|range|date|text|custom)
- `label` (string)
- `options` (array) — static options embedded in config
- `optionsSource` (string) — provider key
- `optionsUrl` (string) — fetch template for client-side fetching
- `uiProps` (object) — placeholder, step, min, max
- `componentKey` (string) — for `custom` fields
 - `dataSource` (object) — optional declarative DB or provider mapping (server-validated; see 2.3.1)

---

End of draft. Please tell me if you want this expanded into a formal ADR or if I should scaffold the `FilterRenderer` and server manifest endpoint next.
