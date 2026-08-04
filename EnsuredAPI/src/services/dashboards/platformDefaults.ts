/**
 * Configurable Home dashboards — platform tier.
 *
 * A *surface* is one configurable dashboard (e.g. the Marketplace landing page or
 * the Insurer Analytics page). Every surface has:
 *   - a **widget catalog**: the closed set of widgets that may appear on it, with
 *     their default and minimum grid sizes; and
 *   - a **platform-default layout**: the placement that ships in code and mirrors
 *     today's hardcoded arrangement, so nothing changes visually until an org or
 *     user customizes it.
 *
 * Defaults live in code (version-controlled, ship with the app) rather than the
 * database — the same spirit as `services/navigation/catalog.ts`. Only org and
 * user overrides are persisted (see `dashboardLayout.models.ts`).
 *
 * The catalog is the server-authoritative guardrail: a saved layout may only
 * reference widget keys this catalog declares for that surface, and the grid is
 * 12 columns wide (react-grid-layout convention) on every surface.
 */

import { validateMetricDefinition } from './metrics';
import { METRIC_PRESETS } from './metricPresets';
export { METRIC_PRESETS } from './metricPresets';
export type { MetricPreset } from './metricPresets';
import {
  DASHBOARD_GRID_COLUMNS,
  SURFACE_KEYS,
  RESERVED_TITLE_KEY,
  SURFACES,
  WIDGET_SETTINGS,
} from './constants';
import type { SurfaceKey } from './constants';
import type {
  LayoutItem,
  DashboardLayout as DashboardLayoutGeneric,
  WidgetSettingField,
  SettingsSchema,
  CatalogWidget,
  SurfaceSpec,
  SettingIssue,
} from './types';

export { DASHBOARD_GRID_COLUMNS, SURFACE_KEYS, RESERVED_TITLE_KEY } from './constants';
export type { SurfaceKey } from './constants';
export type { LayoutItem, WidgetSettingField, SettingsSchema, CatalogWidget, SurfaceSpec, SettingIssue } from './types';
export type DashboardLayout = DashboardLayoutGeneric<SurfaceKey>;

export function isSurfaceKey(value: unknown): value is SurfaceKey {
  return typeof value === 'string' && (SURFACE_KEYS as readonly string[]).includes(value);
}

/** Types are defined in `types.ts` and re-exported above. */

/** Base key of a (possibly instanced) widget key: `custom-metric:abc` → `custom-metric`. */
export function baseWidgetKey(widgetKey: string): string {
  const i = widgetKey.indexOf(':');
  return i === -1 ? widgetKey : widgetKey.slice(0, i);
}


/* SurfaceSpec type is exported from ./types */

/** The declared settings schema for a widget (empty ⇒ rename only). */
export function settingsSchemaFor(widgetKey: string): SettingsSchema {
  return WIDGET_SETTINGS[baseWidgetKey(widgetKey)] ?? [];
}

/** The widget catalog for a surface (closed set of placeable widgets + schemas). */
export function catalogFor(surfaceKey: SurfaceKey): CatalogWidget[] {
  return SURFACES[surfaceKey].catalog.map((c) => {
    const schema = WIDGET_SETTINGS[c.widgetKey];
    return schema ? { ...c, settingsSchema: schema } : c;
  });
}

/** Set of valid widget keys for a surface, for fast validation. */
export function widgetKeySet(surfaceKey: SurfaceKey): Set<string> {
  return new Set(SURFACES[surfaceKey].catalog.map((c) => c.widgetKey));
}

/** The platform-default layout for a surface (predefined live-metric widgets). */
export function platformDefault(surfaceKey: SurfaceKey): DashboardLayoutGeneric<SurfaceKey> {
  // Deep-clone so a default's preset definition can never be mutated in place by
  // a user editing their seeded draft.
  const items: LayoutItem[] = SURFACES[surfaceKey].defaultLayout.map(
    (it) => JSON.parse(JSON.stringify(it)) as LayoutItem,
  );
  return { surfaceKey, version: 1, items };
}

/** The predefined metric presets (for the Add-widget "start from preset" menu). */
export function metricPresets(): typeof METRIC_PRESETS {
  return METRIC_PRESETS;
}

/**
 * Validate a candidate layout against a surface's catalog. Returns the list of
 * offending widget keys (empty ⇒ valid). The route rejects any non-empty result.
 */
export function invalidWidgetKeys(surfaceKey: SurfaceKey, layout: unknown): string[] {
  const catalog = catalogFor(surfaceKey);
  const allowed = new Set(catalog.map((c) => c.widgetKey));
  const instanceable = new Set(catalog.filter((c) => c.instanceable).map((c) => c.widgetKey));
  const items = (layout as DashboardLayout | null | undefined)?.items;
  if (!Array.isArray(items)) return ['__missing_items__'];
  const bad: string[] = [];
  for (const item of items) {
    const key = (item as LayoutItem)?.widgetKey;
    if (typeof key !== 'string') {
      bad.push(String(key));
      continue;
    }
    const base = baseWidgetKey(key);
    if (key !== base) {
      // Instanced key `base:id` — only allowed for instanceable base widgets.
      if (!instanceable.has(base)) bad.push(key);
    } else if (!allowed.has(base)) {
      bad.push(key);
    }
  }
  return bad;
}

/** One rejected setting, returned by {@link invalidWidgetSettings}. (type from ./types) */

/**
 * Validate every item's `settings` against its widget's declared schema. Returns
 * the list of offending settings (empty ⇒ valid). Unknown keys, wrong types, and
 * out-of-range/enum values are all rejected; the reserved `title` rename is always
 * allowed as long as it is a string.
 */
export function invalidWidgetSettings(
  surfaceKey: SurfaceKey,
  layout: DashboardLayoutGeneric<SurfaceKey>,
  organizationId?: number | null,
): SettingIssue[] {
  const issues: SettingIssue[] = [];
  for (const item of layout.items ?? []) {
    const settings = item.settings;
    if (!settings || typeof settings !== 'object') continue;

    // Custom-metric instances carry a structured `definition` (validated against
    // the org catalog) plus the universal `title`; nothing else.
    if (baseWidgetKey(item.widgetKey) === 'custom-metric') {
      for (const key of Object.keys(settings)) {
        if (key !== 'definition' && key !== RESERVED_TITLE_KEY) {
          issues.push({ widgetKey: item.widgetKey, key, reason: 'unknown setting' });
        }
      }
      if (typeof (settings as any).title !== 'undefined' && typeof (settings as any).title !== 'string') {
        issues.push({ widgetKey: item.widgetKey, key: 'title', reason: 'title must be a string' });
      }
      if (typeof (settings as any).definition === 'undefined') {
        issues.push({ widgetKey: item.widgetKey, key: 'definition', reason: 'metric definition required' });
      } else if (organizationId != null) {
        for (const reason of validateMetricDefinition(organizationId, (settings as any).definition)) {
          issues.push({ widgetKey: item.widgetKey, key: 'definition', reason });
        }
      }
      continue;
    }

    const schema = new Map(settingsSchemaFor(item.widgetKey).map((f) => [f.key, f]));
    for (const [key, value] of Object.entries(settings)) {
      const push = (reason: string) => issues.push({ widgetKey: item.widgetKey, key, reason });
      if (key === RESERVED_TITLE_KEY) {
        if (typeof value !== 'string') push('title must be a string');
        continue;
      }
      const field = schema.get(key);
      if (!field) {
        push('unknown setting');
        continue;
      }
      if (field.type === 'boolean' && typeof value !== 'boolean') push('expected boolean');
      else if (field.type === 'text' && typeof value !== 'string') push('expected string');
      else if (field.type === 'number') {
        if (typeof value !== 'number' || !Number.isFinite(value)) push('expected number');
        else if (field.min != null && value < field.min) push(`min ${field.min}`);
        else if (field.max != null && value > field.max) push(`max ${field.max}`);
      } else if (field.type === 'select' && !field.options.some((o) => o.value === value)) {
        push('not an allowed option');
      }
    }
  }
  return issues;
}

/**
 * Coerce arbitrary input into a clean, surface-stamped layout: drops unknown
 * widget keys is NOT done here (validation happens first); this only normalizes
 * coordinate fields to finite numbers and strips extraneous properties.
 */
export function normalizeLayout(surfaceKey: SurfaceKey, layout: DashboardLayoutGeneric<SurfaceKey>): DashboardLayoutGeneric<SurfaceKey> {
  const num = (v: unknown, fallback: number): number => (Number.isFinite(Number(v)) ? Number(v) : fallback);
  return {
    surfaceKey,
    version: 1,
    items: layout.items.map((item) => ({
      widgetKey: item.widgetKey,
      x: num(item.x, 0),
      y: num(item.y, 0),
      w: Math.max(1, num(item.w, 1)),
      h: Math.max(1, num(item.h, 1)),
      ...(item.settings && typeof item.settings === 'object' ? { settings: item.settings } : {}),
    })),
  };
}
