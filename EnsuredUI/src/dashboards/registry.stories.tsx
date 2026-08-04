import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import { baseWidgetKey, resolveSettings, renderWidget } from './registry';
import type { LayoutItem, SettingsSchema, ResolvedSettings } from './types';

export default { title: 'Dashboards/registry' } as Meta;

const sampleItem: LayoutItem = { widgetKey: 'custom-metric:1', x: 0, y: 0, w: 4, h: 6, settings: { title: 'Active' } };

const schema: SettingsSchema = [
  { key: 'threshold', label: 'Threshold', type: 'number', default: 10, min: 0, max: 100 },
  { key: 'showDetail', label: 'Show detail', type: 'boolean', default: false },
  { key: 'mode', label: 'Mode', type: 'select', default: 'auto', options: [{ value: 'auto', label: 'Auto' }, { value: 'manual', label: 'Manual' }] },
];

export const BaseKeyAndDefaults: StoryFn = () => (
  <div style={{ padding: 12 }}>
    <div><strong>Base key:</strong> {baseWidgetKey('custom-metric:abc')}</div>
    <div style={{ marginTop: 8 }}>
      <strong>Resolved defaults (no overrides):</strong>
      <pre>{JSON.stringify(resolveSettings(schema, undefined), null, 2)}</pre>
    </div>
  </div>
);

export const WithOverrides: StoryFn = () => {
  const raw = { threshold: 42, showDetail: true, title: 'Active widget' } as Record<string, unknown>;
  const resolved: ResolvedSettings = resolveSettings(schema, raw);
  return (
    <div style={{ padding: 12 }}>
      <div><strong>Raw overrides:</strong> <pre>{JSON.stringify(raw, null, 2)}</pre></div>
      <div style={{ marginTop: 8 }}><strong>Resolved:</strong> <pre>{JSON.stringify(resolved, null, 2)}</pre></div>
    </div>
  );
};

export const WithRenderer: StoryFn = () => {
  const registry = {
    'custom-metric': (item: LayoutItem, settings: ResolvedSettings) => (
      <div style={{ padding: 12, border: '1px solid #ddd' }}>
        <strong>Rendered widget</strong>
        <div>key: {item.widgetKey}</div>
        <div>title: {String(settings.title ?? '<none>')}</div>
        <div>threshold: {String(settings.threshold ?? '<default>')}</div>
      </div>
    ),
  } as any;

  const resolved = resolveSettings(schema, { threshold: 7, title: 'Loaded' });
  return <div style={{ padding: 12 }}>{renderWidget(registry, sampleItem, resolved)}</div>;
};
