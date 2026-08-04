import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import MarketplaceFilterDock, { MarketplaceFilterDockProps } from './MarketplaceFilterDock';
import { action } from '@storybook/addon-actions';
import { getJson } from '../../../api/client';
import { DEFAULT_MARKETPLACE_FILTERS_CONFIG } from './defaultMarketplaceFiltersConfig';

export default {
  title: 'Pages/Marketplace/FilterDock',
  component: MarketplaceFilterDock,
} satisfies Meta<typeof MarketplaceFilterDock>;

// ── Shared arg defaults ────────────────────────────────────────────────────────

const sharedArgs: Partial<MarketplaceFilterDockProps> = {
  filtersConfig: DEFAULT_MARKETPLACE_FILTERS_CONFIG,
  filterValues: {},
  preloadedData: {
    primaryTypes: [
      { value: 'PROPERTY', label: 'Property' },
      { value: 'CASUALTY', label: 'Casualty' },
    ],
    perils: [
      { value: 'HURRICANE', label: 'Hurricane' },
      { value: 'EARTHQUAKE', label: 'Earthquake' },
    ],
  },
  onFilterValuesChange: (state) => action('onFilterValuesChange')(state),
  mapLayerOptions: [{ value: 'heat', label: 'Heat' }, { value: 'density', label: 'Density' }],
  selectedLayers: new Set<string>(),
  onToggleLayer: (v) => action('onToggleLayer')(v),
  onClose: () => action('onClose')(),
  onReset: () => action('onReset')(),
  onApply: () => action('onApply')(),
};

// ── Live-data template — fetches manifest from the running API ─────────────────
//
// When the API is running (npm run dev in EnsuredAPI), the manifest endpoint
// serves the canonical config + real taxonomy / peril rows from the DB.
// If the API is unreachable the component falls back to static story defaults.

type ManifestPayload = {
  config: any;
  data: Record<string, Array<{ value: string; label: string }>>;
  meta: { configVersion: string; timestamp: string };
};

const LiveTemplate: StoryFn<typeof MarketplaceFilterDock> = (args: MarketplaceFilterDockProps) => {
  const [filterValues, setFilterValues] = React.useState<Record<string, unknown>>(
    () => (args as any).filterValues ?? {}
  );
  const [selectedLayers, setSelectedLayers] = React.useState<Set<string>>(
    () => new Set(Array.from((args as any).selectedLayers ?? []))
  );

  // ── Manifest fetch ──────────────────────────────────────────────────────────
  const [manifest, setManifest] = React.useState<ManifestPayload | null>(null);
  const [manifestError, setManifestError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    getJson<ManifestPayload>('/api/marketplace/filters/manifest')
      .then((m) => { if (mounted) setManifest(m); })
      .catch(() => { if (mounted) setManifestError('Manifest unavailable — using story defaults.'); });
    return () => { mounted = false; };
  }, []);

  // Editable manifest state for live editing in Storybook
  const [editedConfigText, setEditedConfigText] = React.useState<string>('');
  const [editedDataText, setEditedDataText] = React.useState<string>('');
  const [editorError, setEditorError] = React.useState<string | null>(null);

  // Initialize editor when manifest loads
  React.useEffect(() => {
    if (!manifest) return;
    try {
      setEditedConfigText(JSON.stringify(manifest.config ?? {}, null, 2));
      setEditedDataText(JSON.stringify(manifest.data ?? {}, null, 2));
      setEditorError(null);
    } catch (e) {
      setEditorError('Failed to initialize editor');
    }
  }, [manifest]);

  const applyEditedManifest = () => {
    try {
      const cfg = editedConfigText ? JSON.parse(editedConfigText) : {};
      const data = editedDataText ? JSON.parse(editedDataText) : {};
      setManifest({ config: cfg, data, meta: manifest?.meta ?? { configVersion: 'edited', timestamp: new Date().toISOString() } });
      setEditorError(null);
    } catch (err: any) {
      setEditorError(err?.message ?? 'Invalid JSON');
    }
  };

  const resetEditor = () => {
    if (!manifest) return;
    setEditedConfigText(JSON.stringify(manifest.config ?? {}, null, 2));
    setEditedDataText(JSON.stringify(manifest.data ?? {}, null, 2));
    setEditorError(null);
  };

  const combined: MarketplaceFilterDockProps = {
    ...(args as MarketplaceFilterDockProps),
    filtersConfig: manifest?.config ?? (args as any).filtersConfig,
    preloadedData: manifest?.data ?? (args as any).preloadedData,
    filterValues,
    selectedLayers,
    onFilterValuesChange: (s) => {
      setFilterValues(s);
      action('onFilterValuesChange')(s);
    },
    onToggleLayer: (value) => {
      setSelectedLayers((prev) => {
        const next = new Set(prev);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return next;
      });
      action('onToggleLayer')(value);
    },
    onReset: () => {
      setFilterValues({});
      setSelectedLayers(new Set());
      action('onReset')();
    },
  };

  return (
    <div style={{ width: 360 }}>
      {manifestError && (
        <p style={{ fontSize: 11, color: '#888', padding: '4px 8px', margin: 0 }}>{manifestError}</p>
      )}
      {/* Manifest editor: only shown when a manifest is available */}
      {manifest ? (
        <div style={{ padding: '8px', border: '1px solid #eee', marginBottom: 8, borderRadius: 6 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Config (editable)</div>
              <textarea value={editedConfigText} onChange={(e) => setEditedConfigText(e.target.value)} style={{ width: '100%', height: 160, fontSize: 12, fontFamily: 'monospace' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Preloaded data (editable)</div>
              <textarea value={editedDataText} onChange={(e) => setEditedDataText(e.target.value)} style={{ width: '100%', height: 160, fontSize: 12, fontFamily: 'monospace' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" onClick={applyEditedManifest}>Apply</button>
            <button type="button" onClick={resetEditor}>Reset</button>
            {editorError ? <div style={{ color: 'crimson', fontSize: 12 }}>{editorError}</div> : null}
          </div>
        </div>
      ) : null}
      <MarketplaceFilterDock {...combined} />
    </div>
  );
};

export const DockDefault = LiveTemplate.bind({});
DockDefault.args = { ...sharedArgs } as any;
DockDefault.storyName = 'Default (live data)';

export const DockWithSelectedLayers = LiveTemplate.bind({});
DockWithSelectedLayers.args = { ...sharedArgs, selectedLayers: new Set(['heat']) } as any;
DockWithSelectedLayers.storyName = 'With selected layer';
