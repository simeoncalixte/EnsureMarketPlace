import React from 'react';
import MapPanel from '../../xds/components/MapPanel';
import type { MapLayerFetchContext } from '../../xds/components/mapLayers';
import { MapSectionWrap } from './Marketplace.styles';
import { useDashboardViewReady } from '../../dashboards/DashboardLoadTransition';
import { colors, withAlpha } from '../../xds/colors';

export type MapLayerControlProps = {
  layersEnabled: Record<string, boolean>;
  onToggleLayer: (layerId: string) => void;
  layerFacets: Record<string, string[]>;
  onToggleLayerFacet: (layerId: string, value: string) => void;
  layerCounts: Record<string, number | null>;
  is3D: boolean;
  onToggle3D: () => void;
};

export function MarketplaceMapSection({
  mapPoints,
  onPointClick,
  layers,
  layerColors,
  fetchContext,
}: {
  mapPoints: Array<{ latitude: number; longitude: number; label?: string; id?: string }>;
  onPointClick: (dealId: string) => void;
  layers: MapLayerControlProps & {
    onLayerCounts: (counts: Record<string, number | null>) => void;
  };
  layerColors?: Record<string, Record<string, string>>;
  fetchContext?: MapLayerFetchContext;
}) {
  const dashboardViewReady = useDashboardViewReady();

  if (!dashboardViewReady) {
    return (
      <MapSectionWrap>
        <div
          aria-label="Map waiting for dashboard layout"
          style={{
            width: '100%',
            height: 'clamp(360px, calc(100vh - 320px), 700px)',
            boxSizing: 'border-box',
            border: `1px solid ${colors.outlineVariant}`,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${withAlpha(colors.surfaceRaised, .7)}, ${withAlpha(colors.surfaceDeep, .9)})`,
          }}
        />
      </MapSectionWrap>
    );
  }

  return (
    <MapSectionWrap>
      <MapPanel
        points={mapPoints}
        onPointClick={onPointClick}
        showLayerBar={false}
        layersEnabled={layers.layersEnabled}
        onToggleLayer={layers.onToggleLayer}
        layerFacets={layers.layerFacets}
        onToggleLayerFacet={layers.onToggleLayerFacet}
        layerColors={layerColors}
        is3D={layers.is3D}
        onLayerCounts={layers.onLayerCounts}
        fetchContext={fetchContext}
      />
    </MapSectionWrap>
  );
}

export default MarketplaceMapSection;
