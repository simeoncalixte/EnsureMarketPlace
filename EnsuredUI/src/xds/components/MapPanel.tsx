import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { colors, withAlpha } from '../colors'
import { radii } from '../tokens'
import Checkbox from './Checkbox'
import { MAP_LAYERS, type MapLayerDef } from './mapLayers'

// Dark basemap to match the application theme.
const MAP_STYLE = 'mapbox://styles/mapbox/dark-v11'
const MAP_STYLE_PREFLIGHT = 'https://api.mapbox.com/styles/v1/mapbox/dark-v11'

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
  /** Controlled 3D-buildings mode; omit for the internal toggle button. */
  is3D?: boolean
  /** Feature counts per layer, reported as they load (drives control labels). */
  onLayerCounts?: (counts: Record<string, number | null>) => void
}

export const MapPanel: React.FC<MapPanelProps> = ({
  title,
  description,
  stats = [],
  points = [],
  onPointClick,
  showLayerBar = true,
  layersEnabled,
  onToggleLayer,
  layerFacets,
  onToggleLayerFacet,
  is3D: is3DProp,
  onLayerCounts,
}) => {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [internal3D, setInternal3D] = useState(false)
  const is3D = is3DProp ?? internal3D

  // Registry-driven layer control. Each MAP_LAYERS entry owns its own data + mapbox layers; this
  // component is the generic engine that installs, toggles, refreshes and counts them. Visibility
  // and facet selections are controlled via props when provided, internal state otherwise.
  const [internalEnabled, setInternalEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(MAP_LAYERS.map((l) => [l.id, l.defaultEnabled])),
  )
  const [counts, setCounts] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(MAP_LAYERS.map((l) => [l.id, null])),
  )
  const [internalFacets, setInternalFacets] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      MAP_LAYERS.filter((l) => l.filter).map((l) => [l.id, l.filter!.options.map((o) => o.value)]),
    ),
  )
  const enabled = layersEnabled ?? internalEnabled
  const facets = layerFacets ?? internalFacets

  // Refs so async install paths read current state without re-running on every toggle.
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const facetsRef = useRef(facets)
  facetsRef.current = facets
  const pointsRef = useRef<MapPoint[]>(points)
  pointsRef.current = points
  const onPointClickRef = useRef(onPointClick)
  onPointClickRef.current = onPointClick
  const onLayerCountsRef = useRef(onLayerCounts)
  onLayerCountsRef.current = onLayerCounts
  const layerIdsRef = useRef<Record<string, string[]>>({})
  const intervalsRef = useRef<number[]>([])
  const markersRef = useRef<mapboxgl.Marker[]>([])
  // Tracks which layers have been installed so heavy layers (e.g. fault lines) are fetched lazily
  // on first enable rather than eagerly on map load.
  const installedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    onLayerCountsRef.current?.(counts)
  }, [counts])

  const apply3D = (map: mapboxgl.Map, enable: boolean) => {
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

  // Fetch a layer's GeoJSON and add (or refresh) its source + mapbox layers. The source id is the
  // layer's `id`; the def's `install()` adds the actual layers and returns their ids for toggling.
  const installLayer = async (map: mapboxgl.Map, def: MapLayerDef) => {
    try {
      const data = await def.fetchData()
      if (mapRef.current !== map) return // unmounted / replaced mid-flight
      const sourceId = def.id

      if (map.getSource(sourceId)) {
        ;(map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(data)
      } else {
        map.addSource(sourceId, { type: 'geojson', data })
        const visibility = enabledRef.current[def.id] ? 'visible' : 'none'
        layerIdsRef.current[def.id] = def.install(map, sourceId, visibility)
      }

      // Re-assert the current facet selection (layers are recreated on first install; setData on
      // refresh keeps the filter, but applying again is idempotent and covers both paths).
      if (def.filter) def.filter.apply(map, facetsRef.current[def.id] ?? def.filter.options.map((o) => o.value))

      const count = Array.isArray(data?.features) ? data.features.length : 0
      setCounts((c) => ({ ...c, [def.id]: count }))
    } catch (err) {
      console.warn(`Failed to load "${def.id}" layer:`, err)
      if (mapRef.current === map) setCounts((c) => ({ ...c, [def.id]: 0 }))
    }
  }

  // Install a layer once (idempotent) and start its refresh interval. Heavy layers stay un-fetched
  // until the user first enables them; this is the only place that flips the layer to installed.
  const ensureLayer = (map: mapboxgl.Map, def: MapLayerDef) => {
    if (installedRef.current.has(def.id)) return
    installedRef.current.add(def.id)
    void installLayer(map, def)
    if (def.refreshMs) {
      const handle = window.setInterval(() => void installLayer(map, def), def.refreshMs)
      intervalsRef.current.push(handle)
    }
  }

  // Hide the base style's country-name labels, keeping the rest of the map. Matches any symbol
  // layer whose id looks like a country label, so it is resilient to style/version differences.
  const hideCountryLabels = (map: mapboxgl.Map) => {
    try {
      const layers = map.getStyle()?.layers ?? []
      layers
        .filter((layer) => layer.type === 'symbol' && /country.*label/i.test(layer.id))
        .forEach((layer) => map.setLayoutProperty(layer.id, 'visibility', 'none'))
    } catch (err) {
      console.warn('Failed to hide country labels:', err)
    }
  }

  // Replace the rendered markers with the current point set. Runs at init and whenever the points
  // change (e.g. the host filtered its deal list) without tearing the map down.
  const syncMarkers = (map: mapboxgl.Map) => {
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = pointsRef.current.map((p) => {
      const marker = new mapboxgl.Marker({ color: colors.primary }).setLngLat([p.longitude, p.latitude])
      // focusAfterOpen would yank the viewport back to the map, fighting hosts
      // that scroll to the clicked point's detail card.
      if (p.label) marker.setPopup(new mapboxgl.Popup({ offset: 12, focusAfterOpen: false }).setText(p.label))
      if (p.id !== undefined) {
        marker.getElement().style.cursor = 'pointer'
        marker.getElement().addEventListener('click', () => {
          onPointClickRef.current?.(p.id as string)
        })
      }
      marker.addTo(map)
      return marker
    })
  }

  // Shared map setup so the primary-token and fallback-token paths behave identically.
  const setupMap = (accessToken: string) => {
    if (!mapContainer.current) return
    mapboxgl.accessToken = accessToken
    const initialPoints = pointsRef.current
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: initialPoints.length ? [initialPoints[0].longitude, initialPoints[0].latitude] : [0, 20],
      zoom: initialPoints.length ? 4 : 2,
    })

    mapRef.current = map
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }))
    map.on('error', (e: any) => console.error('Map load error:', e))

    syncMarkers(map)

    map.on('load', () => {
      hideCountryLabels(map)
      // Only install layers that start enabled; the rest install lazily on first toggle.
      MAP_LAYERS.forEach((def) => {
        if (enabledRef.current[def.id]) ensureLayer(map, def)
      })
    })
    if (is3D) apply3D(map, true)
  }

  // Provide your Mapbox token via Vite env: VITE_MAPBOX_TOKEN
  // Example: VITE_MAPBOX_TOKEN=pk.xxx in .env
  const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_TOKEN as string) || ''
  const FALLBACK_MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_FALLBACK_TOKEN as string) || ''
  const hasToken = Boolean(MAPBOX_TOKEN)
  mapboxgl.accessToken = MAPBOX_TOKEN

  // One-time init. Point changes are handled by the marker-sync effect below, so the map is never
  // torn down and rebuilt after the first render.
  useEffect(() => {
    if (!mapContainer.current) return
    if (mapRef.current) return // already initialized

    if (!hasToken) {
      // Show a clear message in the container when no token is configured
      if (mapContainer.current) mapContainer.current.innerHTML = `<div style="padding:16px;color:${colors.white};background:${colors.neutral[900]};">No Mapbox token configured. Add VITE_MAPBOX_TOKEN in your .env and restart the dev server.</div>`
      return
    }

    // Preflight the Mapbox style to detect 401s; fall back to a public style if unauthorized
    const styleUrl = `${MAP_STYLE_PREFLIGHT}?access_token=${MAPBOX_TOKEN}`
    let aborted = false

    fetch(styleUrl)
      .then((res) => {
        if (aborted) return
        if (res.ok) return 'mapbox'
        if (res.status === 401) return 'unauthorized'
        throw new Error(`Style fetch failed: ${res.status} ${res.statusText}`)
      })
      .then((result) => {
        if (aborted) return
        if (!result) return

        if (result === 'unauthorized') {
          if (FALLBACK_MAPBOX_TOKEN) {
            console.warn('Primary Mapbox token unauthorized; trying fallback token')
            setupMap(FALLBACK_MAPBOX_TOKEN)
            return
          }

          if (mapContainer.current)
            mapContainer.current.innerHTML = `<div style="padding:12px;color:${colors.white};background:${colors.neutral[900]};">Mapbox token unauthorized (401). Provide a valid \`VITE_MAPBOX_TOKEN\` or \`VITE_MAPBOX_FALLBACK_TOKEN\` in your .env.</div>`
          return
        }

        // authorized — use mapbox style
        setupMap(MAPBOX_TOKEN)
      })
      .catch((err) => {
        if (aborted) return
        console.error('Preflight style error:', err)
        if (mapContainer.current) mapContainer.current.innerHTML = `<div style="padding:12px;color:${colors.white};background:${colors.neutral[900]};">Map error: ${String(err)}</div>`
      })

    return () => {
      aborted = true
      intervalsRef.current.forEach((h) => window.clearInterval(h))
      intervalsRef.current = []
      installedRef.current.clear()
      layerIdsRef.current = {}
      markersRef.current = []
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep markers in sync with the host's (possibly filtered) point set.
  const pointsKey = JSON.stringify(points)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    syncMarkers(map)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsKey])

  // Apply each layer's visibility whenever a toggle changes.
  const enabledKey = JSON.stringify(enabled)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    MAP_LAYERS.forEach((def) => {
      // First time a layer is enabled, install it now (lazy fetch). Its `install()` already honours
      // the current visibility, so no extra toggle is needed on this pass.
      if (enabled[def.id] && !installedRef.current.has(def.id)) {
        ensureLayer(map, def)
        return
      }
      const visibility = enabled[def.id] ? 'visible' : 'none'
      ;(layerIdsRef.current[def.id] ?? []).forEach((layerId) => {
        if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visibility)
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledKey])

  // Re-apply facet filters whenever a selection changes (only for already-installed layers).
  const facetsKey = JSON.stringify(facets)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    MAP_LAYERS.forEach((def) => {
      if (!def.filter || !installedRef.current.has(def.id)) return
      def.filter.apply(map, facets[def.id] ?? def.filter.options.map((o) => o.value))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facetsKey])

  // Apply 3D mode whenever it changes (covers the controlled prop).
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    apply3D(map, is3D)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is3D])

  const toggleLayer = (id: string) => {
    if (onToggleLayer) {
      onToggleLayer(id)
    } else {
      setInternalEnabled((e) => ({ ...e, [id]: !e[id] }))
    }
  }

  const toggleFacet = (layerId: string, value: string) => {
    if (onToggleLayerFacet) {
      onToggleLayerFacet(layerId, value)
    } else {
      setInternalFacets((prev) => {
        const current = prev[layerId] ?? []
        const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
        return { ...prev, [layerId]: next }
      })
    }
  }

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
          <div style={{ padding: 32, borderRight: `1px solid ${colors.outlineVariant}`, overflowY: 'auto' }}>
            {title && <h3 style={{ margin: 0, color: colors.text.primary }}>{title}</h3>}
            {description && <p style={{ color: colors.onSurfaceVariant, marginTop: 12 }}>{description}</p>}
            {is3DProp === undefined && (
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={() => setInternal3D((s) => !s)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: `1px solid ${withAlpha(colors.black, 0.12)}`,
                    background: is3D ? colors.dataViz.cyanDeep : colors.white,
                    color: is3D ? colors.white : colors.black,
                    cursor: 'pointer',
                  }}
                >
                  {is3D ? '3D Map (on)' : 'Flat Map (off)'}
                </button>
              </div>
            )}
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stats.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ fontSize: 20, color: colors.secondary }}>●</div>
                  <div>
                    <div style={{ fontSize: 11, color: colors.onSurfaceVariant, fontFamily: 'ui-monospace, Menlo, monospace' }}>{s.label}</div>
                    <div style={{ fontWeight: 700, color: colors.text.primary }}>{s.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Map fills the available height, growing with the viewport up to 700px (or until it
            meets the bottom ticker, whichever comes first). */}
        <div style={{ position: 'relative', height: 'clamp(360px, calc(100vh - 320px), 700px)' }}>
          <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
    </div>
  )
}

// Horizontal layer + facet toolbar shown at the top of the map (the default control surface for
// hosts that don't supply their own).
const LayerControlBar: React.FC<{
  layers: MapLayerDef[]
  enabled: Record<string, boolean>
  counts: Record<string, number | null>
  facets: Record<string, string[]>
  onToggle: (id: string) => void
  onToggleFacet: (layerId: string, value: string) => void
}> = ({ layers, enabled, counts, facets, onToggle, onToggleFacet }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '10px 18px',
        padding: '10px 16px',
        borderBottom: `1px solid ${colors.outlineVariant}`,
        background: colors.surfaceContainer,
        fontSize: 12,
      }}
    >
      <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10, color: colors.onSurfaceVariant }}>
        Map layers
      </span>
      {layers.map((layer) => (
        <div key={layer.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Checkbox
              label={layer.label}
              checked={Boolean(enabled[layer.id])}
              onChange={() => onToggle(layer.id)}
            />
            <span style={{ color: colors.onSurfaceVariant, fontSize: 11 }}>· {layer.note(counts[layer.id] ?? null)}</span>
          </span>
          {/* Faceted filter checkboxes — shown inline only while the parent layer is enabled. */}
          {layer.filter && enabled[layer.id] && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, paddingLeft: 8, borderLeft: `1px solid ${colors.outlineVariant}` }}>
              {layer.filter.label && (
                <span style={{ color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 9, fontWeight: 700 }}>
                  {layer.filter.label}
                </span>
              )}
              {layer.filter.options.map((opt) => (
                <Checkbox
                  key={opt.value}
                  label={opt.label}
                  checked={(facets[layer.id] ?? []).includes(opt.value)}
                  onChange={() => onToggleFacet(layer.id, opt.value)}
                />
              ))}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

export default MapPanel
