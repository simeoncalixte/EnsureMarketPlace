/**
 * Dashboard types extracted from `platformDefaults.ts`.
 * Keep these in a separate file so constants and helpers can import them
 * without creating runtime cycles.
 */
export type LayoutItem = {
  widgetKey: string;
  x: number;
  y: number;
  w: number;
  h: number;
  settings?: Record<string, unknown>;
};

export type DashboardLayout<SK = string> = {
  surfaceKey: SK;
  version: 1;
  items: LayoutItem[];
};

export type WidgetSettingField =
  | { key: string; label: string; type: 'boolean'; default: boolean }
  | { key: string; label: string; type: 'number'; default: number; min?: number; max?: number; step?: number }
  | { key: string; label: string; type: 'text'; default: string }
  | { key: string; label: string; type: 'select'; default: string; options: { value: string; label: string }[] };

export type SettingsSchema = WidgetSettingField[];

export type CatalogWidget = {
  widgetKey: string;
  title: string;
  category: string;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  settingsSchema?: SettingsSchema;
  instanceable?: boolean;
};

export type SurfaceSpec = {
  catalog: CatalogWidget[];
  defaultLayout: LayoutItem[];
};

export type SettingIssue = { widgetKey: string; key: string; reason: string };
