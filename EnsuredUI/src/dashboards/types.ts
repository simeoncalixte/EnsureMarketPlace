import type { MetricDefinition } from './metricTypes';

// Shared types for the configurable Home dashboards, mirroring the backend
// contract in EnsuredAPI `services/dashboards`. A *surface* is one configurable
// dashboard; its effective layout resolves through platform < org < user tiers.

export type SurfaceKey = 'marketplace' | 'insurer-analytics';

export type LayoutSource = 'platform' | 'org' | 'user';

/** One placed widget within a layout (react-grid-layout coordinate units). */
export type LayoutItem = {
  widgetKey: string;
  x: number;
  y: number;
  w: number;
  h: number;
  settings?: Record<string, unknown>;
};

export type DashboardLayoutDoc = {
  surfaceKey: SurfaceKey;
  version: 1;
  items: LayoutItem[];
};

/** One configurable option a widget exposes (mirrors the backend declaration). */
export type WidgetSettingField =
  | { key: string; label: string; type: 'boolean'; default: boolean }
  | { key: string; label: string; type: 'number'; default: number; min?: number; max?: number; step?: number }
  | { key: string; label: string; type: 'text'; default: string }
  | { key: string; label: string; type: 'select'; default: string; options: { value: string; label: string }[] };

export type SettingsSchema = WidgetSettingField[];

/** Resolved settings handed to a widget renderer: declared defaults + saved overrides. */
export type ResolvedSettings = Record<string, unknown> & { title?: string };

/** A widget the surface's catalog allows, with sizing + settings constraints (from server). */
export type CatalogWidget = {
  widgetKey: string;
  title: string;
  category: string;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  settingsSchema?: SettingsSchema;
  /** When true the widget may be placed multiple times (each a `base:id` instance). */
  instanceable?: boolean;
};

/** A predefined metric the user can drop in as a ready-made custom metric. */
export type MetricPreset = {
  id: string;
  title: string;
  group: string;
  definition: MetricDefinition;
};

/** The GET payload: everything the host needs to render and to offer resets. */
export type ResolvedDashboard = {
  surfaceKey: SurfaceKey;
  effective: DashboardLayoutDoc;
  source: LayoutSource;
  org: DashboardLayoutDoc | null;
  platform: DashboardLayoutDoc;
  catalog: CatalogWidget[];
  presets: MetricPreset[];
};
