/**
 * Dashboard helper utilities moved from constants.
 */
import { presetById } from './metricPresets';
import type { CatalogWidget, LayoutItem, WidgetSettingField } from './types';

export function metricItem(presetId: string, x: number, y: number, width: number, height: number): LayoutItem {
  const p = presetById(presetId);
  return {
    widgetKey: `custom-metric:${presetId}`,
    x,
    y,
    w: width,
    h: height,
    settings: p ? { title: p.title, definition: p.definition } : {},
  };
}

export function plainItem(widgetKey: string, x: number, y: number, width: number, height: number): LayoutItem {
  return { widgetKey, x, y, w: width, h: height };
}

export const w = (
  widgetKey: string,
  title: string,
  category: string,
  defW: number,
  defH: number,
  minW = 2,
  minH = 2,
): CatalogWidget => ({
  widgetKey,
  title,
  category,
  defaultSize: { w: defW, h: defH },
  minSize: { w: minW, h: minH },
});

export const monthsBack = (def: number): WidgetSettingField => ({
  key: 'monthsBack',
  label: 'Time range (months)',
  type: 'number',
  default: def,
  min: 3,
  max: 24,
  step: 1,
});
export const showRefLine = (def: boolean): WidgetSettingField => ({
  key: 'showRefLine',
  label: 'Show reference line',
  type: 'boolean',
  default: def,
});
