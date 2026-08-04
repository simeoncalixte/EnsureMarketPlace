import React, { useEffect } from 'react';
import { Meta, StoryFn } from '@storybook/react';
import useDashboardEditor from './useDashboardEditor';
import type { ResolvedDashboard, CatalogWidget } from './types';

export default { title: 'Dashboards/useDashboardEditor' } as Meta;

function Demo({ data, autoBegin }: { data?: ResolvedDashboard | null; autoBegin?: boolean }) {
  const editor = useDashboardEditor(data ?? null);

  useEffect(() => {
    if (autoBegin) editor.beginEdit('user');
  }, [autoBegin]);

  const sampleCatalog: CatalogWidget[] = [
    { widgetKey: 'custom-metric', title: 'Custom Metric', category: 'metrics', defaultSize: { w: 4, h: 6 }, minSize: { w: 3, h: 3 }, instanceable: true },
    { widgetKey: 'chart-1', title: 'Chart', category: 'analytics', defaultSize: { w: 4, h: 6 }, minSize: { w: 2, h: 2 } },
  ];

  const samplePreset = { id: 'p1', title: 'Active', group: 'default', definition: { terms: [], formula: '', viz: 'kpi', format: 'number' } } as any;

  return (
    <div style={{ padding: 12 }}>
      <div style={{ marginBottom: 8 }}><strong>Editing:</strong> {String(editor.editing)} — <strong>Scope:</strong> {editor.scope}</div>
      <div style={{ marginBottom: 8 }}><strong>Draft items:</strong> {editor.draft.map((d) => d.widgetKey).join(', ') || '—'}</div>

      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button onClick={() => editor.beginEdit('user')}>Begin User Edit</button>
        <button onClick={() => editor.beginEdit('org')}>Begin Org Edit</button>
        <button onClick={() => editor.cancelEdit()}>Cancel</button>
      </div>

      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button onClick={() => editor.addWidget(sampleCatalog[0])}>Add Widget (instanceable)</button>
        <button onClick={() => editor.addWidget(sampleCatalog[1])}>Add Widget (single)</button>
        <button onClick={() => editor.addPreset(samplePreset)}>Add Preset</button>
        <button onClick={() => { const last = editor.draft[editor.draft.length - 1]; if (last) editor.removeWidget(last.widgetKey); }}>Remove Last</button>
      </div>

      <div style={{ marginTop: 8 }}>
        <button onClick={() => editor.updateSetting(editor.draft[0]?.widgetKey ?? '', 'title', 'Updated Title')}>Update First Setting</button>
      </div>
    </div>
  );
}

export const Default: StoryFn = () => <Demo data={{ effective: { surfaceKey: 'marketplace', version: 1, items: [] }, catalog: [], presets: [] } as any} />;

export const AutoBegin: StoryFn = () => <Demo autoBegin={true} data={{ effective: { surfaceKey: 'marketplace', version: 1, items: [] }, catalog: [], presets: [] } as any} />;

export const AddAndRemove: StoryFn = () => <Demo data={{ effective: { surfaceKey: 'marketplace', version: 1, items: [] }, catalog: [], presets: [] } as any} />;
