import React from 'react'
import { colors } from '../colors'
import { radii } from '../tokens'
import { MAP_LAYERS } from './mapLayers'
import { LayerControlBar } from './LayerControlBar'
import { MapInfoColumn } from './MapInfoColumn'
import { useMapPanel } from './useMapPanel'
import type { MapPanelProps } from './MapPanel.types'

export type { MapPoint, MapPanelProps } from './MapPanel.types'

/**
 * Generic, registry-driven map surface. The {@link useMapPanel} hook owns the map instance and all
 * imperative layer/marker work; this component is the presentational shell that lays out the
 * (optional) control bar, info column and map canvas.
 */
export const MapPanel: React.FC<MapPanelProps> = (props) => {
  const { title, description, stats = [], showLayerBar = true } = props
  const { containerRef, enabled, facets, counts, is3D, is3DControlled, toggleLayer, toggleFacet, toggleInternal3D } =
    useMapPanel(props)

  const showInfoColumn = Boolean(title || description || stats.length > 0)

  return (
    <div style={{ borderRadius: radii.lg, overflow: 'hidden', border: `1px solid ${colors.outlineVariant}`, background: colors.surfaceContainerLow }}>
      {showLayerBar && (
        <LayerControlBar
          layers={MAP_LAYERS}
          enabled={enabled}
          counts={counts}
          facets={facets}
          onToggle={toggleLayer}
          onToggleFacet={toggleFacet}
        />
      )}
      <div style={{ display: 'grid', gridTemplateColumns: showInfoColumn ? '1fr 2fr' : '1fr' }}>
        {showInfoColumn && (
          <MapInfoColumn
            title={title}
            description={description}
            stats={stats}
            showToggle={!is3DControlled}
            is3D={is3D}
            onToggle3D={toggleInternal3D}
          />
        )}

        {/* Map fills the available height, growing with the viewport up to 700px (or until it
            meets the bottom ticker, whichever comes first). */}
        <div style={{ position: 'relative', height: 'clamp(360px, calc(100vh - 320px), 700px)' }}>
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
    </div>
  )
}

export default MapPanel
