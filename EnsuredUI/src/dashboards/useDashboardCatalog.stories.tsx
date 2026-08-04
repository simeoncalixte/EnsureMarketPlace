import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import useDashboardCatalog from './useDashboardCatalog';
import type { CatalogWidget, LayoutItem } from './types';
import { itemsToRgl } from './utils';

export default { title: 'Dashboards/useDashboardCatalog' } as Meta;

function Demo({ catalog, liveItems, editing }: { catalog?: CatalogWidget[]; liveItems: LayoutItem[]; editing: boolean }) {
  const { catalogMap, catalogEntry, rglLayout } = useDashboardCatalog(catalog, liveItems, editing);

  return (
    <div style={{ padding: 12 }}>
      <div style={{ marginBottom: 8 }}>
        <strong>Catalog keys:</strong> {[...catalogMap.keys()].join(', ')}
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>Catalog entry for first item:</strong> {JSON.stringify(catalogEntry(liveItems[0]?.widgetKey ?? ''))}
      </div>
      <div>
        <strong>RGL layout:</strong>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(rglLayout, null, 2)}</pre>
      </div>
    </div>
  );
}

const sampleCatalog: CatalogWidget[] = [
  { widgetKey: 'chart-1', title: 'Chart One', category: 'analytics', defaultSize: { w: 4, h: 6 }, minSize: { w: 2, h: 2 } },
  { widgetKey: 'custom-metric', title: 'Custom Metric', category: 'metrics', defaultSize: { w: 4, h: 6 }, minSize: { w: 3, h: 3 }, instanceable: true },
];

const sampleDraft: LayoutItem[] = [
  { widgetKey: 'chart-1', x: 0, y: 0, w: 4, h: 6 },
  { widgetKey: 'custom-metric:1', x: 0, y: 6, w: 4, h: 6, settings: { title: 'Active Submissions' } },
];

export const Default: StoryFn = () => <Demo catalog={sampleCatalog} liveItems={sampleDraft} editing={true} />;
