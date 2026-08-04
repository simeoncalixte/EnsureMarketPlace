import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { colors } from '../colors'
import { MAP_LAYERS } from './mapLayers'
import { MAP_STYLE, MAP_STYLE_PREFLIGHT } from './mapPopup'
import { apply3D, createLayerController, hideCountryLabels, renderMarkers, type LayerController } from './mapEngine'
import type { MapPanelProps } from './MapPanel.types'

// Mapbox token via Vite env: VITE_MAPBOX_TOKEN (with optional VITE_MAPBOX_FALLBACK_TOKEN).
const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_TOKEN as string) || ''
const FALLBACK_MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_FALLBACK_TOKEN as string) || ''

const message = (text: string) =>
  `<div style="padding:12px;color:${colors.white};background:${colors.neutral[900]};">${text}</div>`

const defaultEnabled = () => Object.fromEntries(MAP_LAYERS.map((l) => [l.id, l.defaultEnabled]))
const defaultCounts = () => Object.fromEntries(MAP_LAYERS.map((l) => [l.id, null as number | null]))
const defaultFacets = () =>
  Object.fromEntries(
    MAP_LAYERS.filter((l) => l.filter).map((l) => [l.id, l.filter!.options.map((o) => o.value)]),
  )

export type UseMapPanel = {
  containerRef: React.RefObject<HTMLDivElement | null>
  enabled: Record<string, boolean>
  facets: Record<string, string[]>
  counts: Record<string, number | null>
  is3D: boolean
  /** True when the host controls 3D mode (hides the internal toggle button). */
  is3DControlled: boolean
  toggleLayer: (id: string) => void
  toggleFacet: (layerId: string, value: string) => void
  toggleInternal3D: () => void
}

/**
 * Drives a MapPanel: owns the map instance, its layer controller and markers, and resolves the
 * controlled-vs-internal state for layers, facets and 3D mode. The returned values feed a purely
 * presentational component — all imperative map work happens here via {@link mapEngine}.
 */
export const useMapPanel = ({
  points = [],
  onPointClick,
  layersEnabled,
  onToggleLayer,
  layerFacets,
  onToggleLayerFacet,
  layerColors,
  is3D: is3DProp,
  onLayerCounts,
  fetchContext,
}: MapPanelProps): UseMapPanel => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const layersRef = useRef<LayerController | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])

  const [internalEnabled, setInternalEnabled] = useState<Record<string, boolean>>(defaultEnabled)
  const [internalFacets, setInternalFacets] = useState<Record<string, string[]>>(defaultFacets)
  const [internal3D, setInternal3D] = useState(false)
  const [counts, setCounts] = useState<Record<string, number | null>>(defaultCounts)

  // Controlled when the host supplies the value, internal state otherwise.
  const enabled = layersEnabled ?? internalEnabled
  const facets = layerFacets ?? internalFacets
  // Colors are purely controlled (no internal fallback) — default to no overrides.
  const resolvedColors = layerColors ?? {}
  const is3D = is3DProp ?? internal3D

  // Refs so async install paths read current state without re-running on every toggle.
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const facetsRef = useRef(facets)
  facetsRef.current = facets
  const colorsRef = useRef(resolvedColors)
  colorsRef.current = resolvedColors
  const pointsRef = useRef(points)
  pointsRef.current = points
  const onPointClickRef = useRef(onPointClick)
  onPointClickRef.current = onPointClick
  const onLayerCountsRef = useRef(onLayerCounts)
  onLayerCountsRef.current = onLayerCounts
  const fetchContextRef = useRef(fetchContext ?? {})
  fetchContextRef.current = fetchContext ?? {}

  const syncMarkers = (map: mapboxgl.Map) => {
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = renderMarkers(map, pointsRef.current, (id) => onPointClickRef.current?.(id))
  }

  useEffect(() => {
    onLayerCountsRef.current?.(counts)
  }, [counts])

  // Shared map setup so the primary-token and fallback-token paths behave identically.
  const setupMap = (accessToken: string) => {
    if (!containerRef.current) return
    mapboxgl.accessToken = accessToken
    const initialPoints = pointsRef.current
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: initialPoints.length ? [initialPoints[0].longitude, initialPoints[0].latitude] : [0, 20],
      zoom: initialPoints.length ? 4 : 2,
    })

    mapRef.current = map
    layersRef.current = createLayerController(
      map,
      {
        enabled: () => enabledRef.current,
        facets: () => facetsRef.current,
        colors: () => colorsRef.current,
        fetchContext: () => fetchContextRef.current,
      },
      (id, count) => setCounts((c) => ({ ...c, [id]: count })),
    )
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }))
    map.on('error', (e: any) => console.error('Map load error:', e))

    syncMarkers(map)

    map.on('load', () => {
      hideCountryLabels(map)
      // Only install layers that start enabled; the rest install lazily on first toggle.
      MAP_LAYERS.forEach((def) => {
        if (enabledRef.current[def.id]) layersRef.current?.ensure(def)
      })
    })
    if (is3D) apply3D(map, true)
  }

  // One-time init. Point changes are handled by the marker-sync effect below, so the map is never
  // torn down and rebuilt after the first render.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    if (!MAPBOX_TOKEN) {
      containerRef.current.innerHTML = message(
        'No Mapbox token configured. Add VITE_MAPBOX_TOKEN in your .env and restart the dev server.',
      )
      return
    }

    // Preflight the Mapbox style to detect 401s; fall back to a public style if unauthorized.
    let aborted = false
    fetch(`${MAP_STYLE_PREFLIGHT}?access_token=${MAPBOX_TOKEN}`)
      .then((res) => {
        if (aborted) return
        if (res.ok) return 'mapbox'
        if (res.status === 401) return 'unauthorized'
        throw new Error(`Style fetch failed: ${res.status} ${res.statusText}`)
      })
      .then((result) => {
        if (aborted || !result) return
        if (result === 'unauthorized') {
          if (FALLBACK_MAPBOX_TOKEN) {
            console.warn('Primary Mapbox token unauthorized; trying fallback token')
            setupMap(FALLBACK_MAPBOX_TOKEN)
          } else if (containerRef.current) {
            containerRef.current.innerHTML = message(
              'Mapbox token unauthorized (401). Provide a valid `VITE_MAPBOX_TOKEN` or `VITE_MAPBOX_FALLBACK_TOKEN` in your .env.',
            )
          }
          return
        }
        setupMap(MAPBOX_TOKEN)
      })
      .catch((err) => {
        if (aborted) return
        console.error('Preflight style error:', err)
        if (containerRef.current) containerRef.current.innerHTML = message(`Map error: ${String(err)}`)
      })

    return () => {
      aborted = true
      layersRef.current?.dispose()
      layersRef.current = null
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
    if (mapRef.current) syncMarkers(mapRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsKey])

  // Apply each layer's visibility whenever a toggle changes.
  const enabledKey = JSON.stringify(enabled)
  useEffect(() => {
    if (mapRef.current) layersRef.current?.syncVisibility(enabled)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledKey])

  // Re-apply facet filters whenever a selection changes (only for already-installed layers).
  const facetsKey = JSON.stringify(facets)
  useEffect(() => {
    if (mapRef.current) layersRef.current?.syncFacets(facets)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facetsKey])

  // Re-apply color overrides whenever they change (only for already-installed layers).
  const colorsKey = JSON.stringify(resolvedColors)
  useEffect(() => {
    if (mapRef.current) layersRef.current?.syncColors(resolvedColors)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorsKey])

  // Re-fetch visible installed layers whenever the host's fetch context changes.
  const fetchContextKey = JSON.stringify(fetchContext ?? {})
  useEffect(() => {
    if (mapRef.current) layersRef.current?.syncFetchContext()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchContextKey])

  // Apply 3D mode whenever it changes (covers the controlled prop).
  useEffect(() => {
    if (mapRef.current) apply3D(mapRef.current, is3D)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is3D])

  const toggleLayer = (id: string) => {
    if (onToggleLayer) onToggleLayer(id)
    else setInternalEnabled((e) => ({ ...e, [id]: !e[id] }))
  }

  const toggleFacet = (layerId: string, value: string) => {
    if (onToggleLayerFacet) {
      onToggleLayerFacet(layerId, value)
      return
    }
    setInternalFacets((prev) => {
      const current = prev[layerId] ?? []
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
      return { ...prev, [layerId]: next }
    })
  }

  return {
    containerRef,
    enabled,
    facets,
    counts,
    is3D,
    is3DControlled: is3DProp !== undefined,
    toggleLayer,
    toggleFacet,
    toggleInternal3D: () => setInternal3D((s) => !s),
  }
}
