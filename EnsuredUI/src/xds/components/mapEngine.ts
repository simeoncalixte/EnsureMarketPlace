import mapboxgl from 'mapbox-gl'
// Mapbox paint/marker props can't resolve `var()`; use concrete values.
import { rawColors as colors } from '../colors'
import { MAP_LAYERS, type MapLayerDef } from './mapLayers'
import { ensurePopupStyles, POPUP_CLASS } from './mapPopup'
import type { MapPoint } from './MapPanel.types'

// --- Stateless map operations -------------------------------------------------
// Each helper takes the live map and operates on it directly; none hold state,
// so the React layer can call them from effects without re-render concerns.

/** Add or remove the extruded-buildings layer and pitch the camera to suit. */
export const apply3D = (map: mapboxgl.Map, enable: boolean) => {
  try {
    if (enable) {
      const style = map.getStyle()
      if (style && style.sources && style.sources['composite']) {
        if (!map.getLayer('3d-buildings')) {
          map.addLayer({
            id: '3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', ['get', 'extrude'], 'true'] as any,
            type: 'fill-extrusion',
            minzoom: 15,
            paint: {
              'fill-extrusion-color': colors.neutral[300],
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.6,
            },
          } as any)
        }
      } else {
        console.warn('Composite source not available; 3D buildings not added')
      }
      map.easeTo({ pitch: 60, bearing: -17, duration: 800 })
    } else {
      if (map.getLayer('3d-buildings')) map.removeLayer('3d-buildings')
      map.easeTo({ pitch: 0, bearing: 0, duration: 800 })
    }
  } catch (err) {
    console.warn('Failed to toggle 3D:', err)
  }
}

/** Hide the base style's country-name labels, keeping the rest of the map. Matches any symbol
 * layer whose id looks like a country label, so it is resilient to style/version differences. */
export const hideCountryLabels = (map: mapboxgl.Map) => {
  try {
    const layers = map.getStyle()?.layers ?? []
    layers
      .filter((layer) => layer.type === 'symbol' && /country.*label/i.test(layer.id))
      .forEach((layer) => map.setLayoutProperty(layer.id, 'visibility', 'none'))
  } catch (err) {
    console.warn('Failed to hide country labels:', err)
  }
}

/** Render a fresh set of markers for `points`, returning them so the caller can remove them later. */
export const renderMarkers = (
  map: mapboxgl.Map,
  points: MapPoint[],
  onPointClick?: (id: string) => void,
): mapboxgl.Marker[] =>
  points.map((p) => {
    const marker = new mapboxgl.Marker({ color: colors.primary }).setLngLat([p.longitude, p.latitude])
    // focusAfterOpen would yank the viewport back to the map, fighting hosts
    // that scroll to the clicked point's detail card.
    if (p.label) {
      ensurePopupStyles()
      marker.setPopup(
        new mapboxgl.Popup({ offset: 12, focusAfterOpen: false, className: POPUP_CLASS }).setText(p.label),
      )
    }
    if (p.id !== undefined) {
      marker.getElement().style.cursor = 'pointer'
      marker.getElement().addEventListener('click', () => onPointClick?.(p.id as string))
    }
    marker.addTo(map)
    return marker
  })

// --- Layer controller ---------------------------------------------------------

export type LayerController = {
  /** Install a layer once (idempotent) and start its refresh interval. */
  ensure: (def: MapLayerDef) => void
  /** Install newly-enabled layers and toggle visibility for the rest. */
  syncVisibility: (enabled: Record<string, boolean>) => void
  /** Re-apply facet selections to already-installed layers. */
  syncFacets: (facets: Record<string, string[]>) => void
  /** Tear down intervals + installed-layer bookkeeping (map removal is the caller's job). */
  dispose: () => void
}

/**
 * Owns the lifecycle of the registry's map layers for a single map instance: lazy installation,
 * refresh intervals, visibility toggling, facet filtering and feature counting. State (which layers
 * are installed, their mapbox layer ids, interval handles) lives in this closure rather than React
 * refs, keeping the hook that drives it thin.
 */
export const createLayerController = (
  map: mapboxgl.Map,
  read: { enabled: () => Record<string, boolean>; facets: () => Record<string, string[]> },
  onCount: (id: string, count: number) => void,
): LayerController => {
  const installed = new Set<string>()
  const layerIds: Record<string, string[]> = {}
  const intervals: number[] = []

  // Fetch a layer's GeoJSON and add (or refresh) its source + mapbox layers. The source id is the
  // layer's `id`; the def's `install()` adds the actual layers and returns their ids for toggling.
  const installLayer = async (def: MapLayerDef) => {
    try {
      const data = await def.fetchData()
      const sourceId = def.id

      if (map.getSource(sourceId)) {
        ;(map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(data)
      } else {
        map.addSource(sourceId, { type: 'geojson', data })
        const visibility = read.enabled()[def.id] ? 'visible' : 'none'
        layerIds[def.id] = def.install(map, sourceId, visibility)
      }

      // Re-assert the current facet selection (layers are recreated on first install; setData on
      // refresh keeps the filter, but applying again is idempotent and covers both paths).
      if (def.filter) def.filter.apply(map, read.facets()[def.id] ?? def.filter.options.map((o) => o.value))

      onCount(def.id, Array.isArray(data?.features) ? data.features.length : 0)
    } catch (err) {
      console.warn(`Failed to load "${def.id}" layer:`, err)
      onCount(def.id, 0)
    }
  }

  const ensure = (def: MapLayerDef) => {
    if (installed.has(def.id)) return
    installed.add(def.id)
    void installLayer(def)
    if (def.refreshMs) {
      intervals.push(window.setInterval(() => void installLayer(def), def.refreshMs))
    }
  }

  const syncVisibility = (enabled: Record<string, boolean>) => {
    MAP_LAYERS.forEach((def) => {
      // First time a layer is enabled, install it now (lazy fetch). Its `install()` already honours
      // the current visibility, so no extra toggle is needed on this pass.
      if (enabled[def.id] && !installed.has(def.id)) {
        ensure(def)
        return
      }
      const visibility = enabled[def.id] ? 'visible' : 'none'
      ;(layerIds[def.id] ?? []).forEach((layerId) => {
        if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visibility)
      })
    })
  }

  const syncFacets = (facets: Record<string, string[]>) => {
    MAP_LAYERS.forEach((def) => {
      if (!def.filter || !installed.has(def.id)) return
      def.filter.apply(map, facets[def.id] ?? def.filter.options.map((o) => o.value))
    })
  }

  const dispose = () => {
    intervals.forEach((h) => window.clearInterval(h))
    intervals.length = 0
    installed.clear()
  }

  return { ensure, syncVisibility, syncFacets, dispose }
}
