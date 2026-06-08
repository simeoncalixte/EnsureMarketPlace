import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { colors, withAlpha } from '../colors'
import { radii } from '../tokens'
import { MAP_LAYERS, type MapLayerDef } from './mapLayers'

export const MapPanel: React.FC<{
  title?: string
  stats?: Array<{ label: string; value: string }>
  points?: Array<{ latitude: number; longitude: number; label?: string }>
}> = ({ title, stats = [], points = [] }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [is3D, setIs3D] = useState(false)

  // Registry-driven layer control. Each MAP_LAYERS entry owns its own data + mapbox layers; this
  // component is the generic engine that installs, toggles, refreshes and counts them. `enabled`
  // mirrors the control-panel checkboxes; `counts` is each layer's loaded feature count (null while
  // loading) shown as the status note.
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(MAP_LAYERS.map((l) => [l.id, l.defaultEnabled])),
  )
  const [counts, setCounts] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(MAP_LAYERS.map((l) => [l.id, null])),
  )
  // Selected facet values per filterable layer (e.g. active-events peril types). Starts all-selected.
  const [filters, setFilters] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      MAP_LAYERS.filter((l) => l.filter).map((l) => [l.id, l.filter!.options.map((o) => o.value)]),
    ),
  )
  // Refs so the async install path reads current visibility without re-running on every toggle.
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const filtersRef = useRef(filters)
  filtersRef.current = filters
  const layerIdsRef = useRef<Record<string, string[]>>({})
  const intervalsRef = useRef<number[]>([])
  // Tracks which layers have been installed so heavy layers (e.g. fault lines) are fetched lazily
  // on first enable rather than eagerly on map load.
  const installedRef = useRef<Set<string>>(new Set())

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
      if (def.filter) def.filter.apply(map, filtersRef.current[def.id] ?? def.filter.options.map((o) => o.value))

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

  // Hide the base style's country-name labels (e.g. Streets v11 `country-label`), keeping the
  // rest of the map. Matches any symbol layer whose id looks like a country label, so it is
  // resilient to style/version differences.
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

  // Shared map setup so the primary-token and fallback-token paths behave identically.
  const setupMap = (accessToken: string) => {
    if (!mapContainer.current) return
    mapboxgl.accessToken = accessToken
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: points.length ? [points[0].longitude, points[0].latitude] : [0, 20],
      zoom: points.length ? 4 : 2,
    })

    mapRef.current = map
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }))
    map.on('error', (e: any) => console.error('Map load error:', e))

    points.forEach((p) => {
      const marker = new mapboxgl.Marker().setLngLat([p.longitude, p.latitude])
      if (p.label) marker.setPopup(new mapboxgl.Popup({ offset: 12 }).setText(p.label))
      marker.addTo(map)
    })

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
  useEffect(() => {
    if (!mapContainer.current) return
    if (mapRef.current) return // already initialized

    if (!hasToken) {
      // Show a clear message in the container when no token is configured
      if (mapContainer.current) mapContainer.current.innerHTML = `<div style="padding:16px;color:${colors.white};background:${colors.neutral[900]};">No Mapbox token configured. Add VITE_MAPBOX_TOKEN in your .env and restart the dev server.</div>`
      return
    }

    // Preflight the Mapbox style to detect 401s; fall back to a public style if unauthorized
    const styleUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11?access_token=${MAPBOX_TOKEN}`
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
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [points])

  // Apply each layer's visibility whenever a toggle changes.
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
  }, [enabled])

  // Re-apply facet filters whenever a checkbox changes (only for already-installed layers).
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    MAP_LAYERS.forEach((def) => {
      if (!def.filter || !installedRef.current.has(def.id)) return
      def.filter.apply(map, filters[def.id] ?? def.filter.options.map((o) => o.value))
    })
  }, [filters])

  const toggleLayer = (id: string) => setEnabled((e) => ({ ...e, [id]: !e[id] }))

  const toggleFilter = (layerId: string, value: string) =>
    setFilters((prev) => {
      const current = prev[layerId] ?? []
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
      return { ...prev, [layerId]: next }
    })

  return (
    <div style={{ borderRadius: radii.lg, overflow: 'hidden', border: `1px solid ${colors.outlineVariant}`, background: colors.surfaceContainerLow }}>
      {/* Layer + facet filters as a horizontal toolbar at the top of the section, alongside any
          other section filters — no longer floating over the map. */}
      <LayerControlBar
        layers={MAP_LAYERS}
        enabled={enabled}
        counts={counts}
        filters={filters}
        onToggle={toggleLayer}
        onToggleFilter={toggleFilter}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr' }}>
        <div style={{ padding: 32, borderRight: `1px solid ${colors.outlineVariant}`, overflowY: 'auto' }}>
          {title && <h3 style={{ margin: 0, color: colors.text.primary }}>{title}</h3>}
          <p style={{ color: colors.onSurfaceVariant, marginTop: 12 }}>Oracles verify real-world events across the globe. Our ledger settles payouts within blocks of confirmed data arrival.</p>
          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => setIs3D((s) => !s)}
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

        {/* Map fills the available height, growing with the viewport up to 700px (or until it
            meets the bottom ticker, whichever comes first). */}
        <div style={{ position: 'relative', height: 'clamp(360px, calc(100vh - 320px), 700px)' }}>
          <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
    </div>
  )
}

// Horizontal layer + filter toolbar shown at the top of the map section (in place of the old
// floating overlay), so the controls sit with the rest of the section's filters.
const LayerControlBar: React.FC<{
  layers: MapLayerDef[]
  enabled: Record<string, boolean>
  counts: Record<string, number | null>
  filters: Record<string, string[]>
  onToggle: (id: string) => void
  onToggleFilter: (layerId: string, value: string) => void
}> = ({ layers, enabled, counts, filters, onToggle, onToggleFilter }) => {
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
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: colors.text.primary }}>
            <input type="checkbox" checked={Boolean(enabled[layer.id])} onChange={() => onToggle(layer.id)} />
            <span style={{ fontWeight: 600 }}>{layer.label}</span>
            <span style={{ color: colors.onSurfaceVariant, fontSize: 11 }}>· {layer.note(counts[layer.id] ?? null)}</span>
          </label>
          {/* Faceted filter checkboxes — shown inline only while the parent layer is enabled. */}
          {layer.filter && enabled[layer.id] && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, paddingLeft: 8, borderLeft: `1px solid ${colors.outlineVariant}` }}>
              {layer.filter.label && (
                <span style={{ color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 9, fontWeight: 700 }}>
                  {layer.filter.label}
                </span>
              )}
              {layer.filter.options.map((opt) => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: colors.text.secondary, fontSize: 11 }}>
                  <input
                    type="checkbox"
                    checked={(filters[layer.id] ?? []).includes(opt.value)}
                    onChange={() => onToggleFilter(layer.id, opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

export default MapPanel
