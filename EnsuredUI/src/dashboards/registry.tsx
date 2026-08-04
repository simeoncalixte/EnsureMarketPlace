import type { ReactNode } from 'react';
import type { LayoutItem, ResolvedSettings, SettingsSchema } from './types';

// A surface registry maps a widgetKey to the renderer that draws its body. The
// server-provided catalog owns titles, sizing AND the settings schema; the
// registry owns rendering. Widgets read their surface's data from a React context
// provided by the surface wrapper (see analyticsWidgets.tsx / marketplaceWidgets.tsx),
// so the host stays generic and never threads data through. Each renderer also
// receives its fully-resolved settings (declared defaults + saved overrides).

export type WidgetRenderContext = {
  editing: boolean;
  updateSetting: (key: string, value: unknown) => void;
  openSettings: (sectionKey?: string) => void;
};

export type WidgetRenderer = (item: LayoutItem, settings: ResolvedSettings, context?: WidgetRenderContext) => ReactNode;

export type SurfaceRegistry = Record<string, WidgetRenderer>;

/** Apply a widget's schema defaults under its saved settings, keeping the `title` rename. */
export function resolveSettings(schema: SettingsSchema | undefined, raw: Record<string, unknown> | undefined): ResolvedSettings {
  const out: ResolvedSettings = {};
  for (const field of schema ?? []) {
    out[field.key] = raw?.[field.key] ?? field.default;
  }
  if (typeof raw?.title === 'string') out.title = raw.title;
  return out;
}

/** Base key of a (possibly instanced) widget key: `custom-metric:abc` → `custom-metric`. */
export function baseWidgetKey(widgetKey: string): string {
  const i = widgetKey.indexOf(':');
  return i === -1 ? widgetKey : widgetKey.slice(0, i);
}

/** Render a widget body, resolving instanced keys (`base:id`) to their base renderer. */
export function renderWidget(
  registry: SurfaceRegistry,
  item: LayoutItem,
  settings: ResolvedSettings,
  context?: WidgetRenderContext,
): ReactNode {
  const renderer = registry[item.widgetKey] ?? registry[baseWidgetKey(item.widgetKey)];
  if (!renderer) return null;
  return renderer(item, settings, context);
}
