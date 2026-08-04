import type { MapLayerFetchContext } from './mapLayers'

export type MapPoint = {
  latitude: number
  longitude: number
  label?: string
  /** Opaque id handed back through `onPointClick` (e.g. a deal id). */
  id?: string
}

export type MapPanelProps = {
  /** Optional info column; the column renders only when a title or stats are given. */
  title?: string
  description?: string
  stats?: Array<{ label: string; value: string }>
  points?: MapPoint[]
  /** Invoked with the point's `id` when its marker is clicked. */
  onPointClick?: (id: string) => void
  /** Render the built-in layer toolbar (default). Hosts that own the layer
   * controls (e.g. a page-level filter rail) set this false and drive the
   * layers through the controlled props below. */
  showLayerBar?: boolean
  /** Controlled layer visibility keyed by layer id; omit for internal state. */
  layersEnabled?: Record<string, boolean>
  onToggleLayer?: (layerId: string) => void
  /** Controlled facet selections keyed by layer id; omit for internal state. */
  layerFacets?: Record<string, string[]>
  onToggleLayerFacet?: (layerId: string, value: string) => void
  /** Controlled per-layer color overrides keyed by layer id → (category → hex).
   * A layer reapplies these via its `applyColors` hook; omit to use defaults. */
  layerColors?: Record<string, Record<string, string>>
  /** Controlled 3D-buildings mode; omit for the internal toggle button. */
  is3D?: boolean
  /** Feature counts per layer, reported as they load (drives control labels). */
  onLayerCounts?: (counts: Record<string, number | null>) => void
  /** Optional dynamic context consumed by layer fetchers (for query-driven APIs). */
  fetchContext?: MapLayerFetchContext
}
