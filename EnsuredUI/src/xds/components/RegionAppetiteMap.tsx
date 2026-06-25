import React, { useEffect, useMemo, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import styled from 'styled-components'
import { colors, withAlpha, rawColors, hexToRgba } from '../colors'
import { radii, spacing, typography } from '../tokens'
import {
  APPETITE_STANCE_LABEL,
  APPETITE_STANCE_ORDER,
  countryStances,
  cycleStanceFor,
  granularityForZoom,
  normalizeStance,
  regionLabel,
  setStance,
  stanceOf,
  type AppetiteStance,
  type ClickGranularity,
  type JurisdictionStances,
  type RegionSearchOption,
  type RegionShapeFeature,
} from './regionAppetite'

// Same Vite env var the rest of the map stack uses.
const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_TOKEN as string) || ''

// Mapbox-hosted country polygons — no GeoJSON to ship; features expose
// `iso_3166_1` (alpha-2), `worldview` and `disputed` properties.
const COUNTRIES_URL = 'mapbox://mapbox.country-boundaries-v1'
const SRC = 'region-appetite-countries'
const SRC_LAYER = 'country_boundaries'
const FILL = 'region-appetite-fill'
const LINE = 'region-appetite-line'

// Overlay for fetched state/city boundaries (from /api/geolocation/shape).
const SHAPE_SRC = 'region-appetite-shapes'
const SHAPE_FILL = 'region-appetite-shape-fill'
const SHAPE_LINE = 'region-appetite-shape-line'

// Per-stance fill/swatch colors, graded most → least favorable (green → red),
// distinct enough to read as bands at a glance. Concrete hex (rawColors), NOT the
// var()-based `colors.*`: these feed Mapbox paint expressions, and Mapbox GL
// cannot parse `var(--xds-*)` — the var form makes every fill render uncolored.
const STANCE_COLORS: Record<AppetiteStance, string> = {
  target: rawColors.accentStrong,
  acceptable: rawColors.dataViz.teal,
  restricted: rawColors.dataViz.amber,
  refer: rawColors.dataViz.orange,
  decline: rawColors.dangerBright,
}
// Regions with no explicit stance (neutral — not yet classified).
const STANCE_UNSET_COLOR = rawColors.outline

const GRANULARITY_LABEL: Record<ClickGranularity, string> = {
  country: 'Country',
  state: 'State / province',
  city: 'City',
}

// Render disputed areas once and pick the US worldview so countries don't double-paint.
const WORLDVIEW_FILTER: any = [
  'all',
  ['==', ['get', 'disputed'], 'false'],
  ['any', ['==', 'all', ['get', 'worldview']], ['in', 'US', ['get', 'worldview']]],
]

// Country tileset fill: map each selected ISO code to its stance color via a
// `match` on iso_3166_1, grouping codes that share a stance. Mapbox `match` needs
// at least one (label, output) arm, so fall back to a flat transparent fill when
// nothing is selected.
const countryStanceColorExpr = (byCode: Record<string, AppetiteStance>): any => {
  const codes = Object.keys(byCode)
  if (codes.length === 0) return 'rgba(0,0,0,0)'
  const expr: any[] = ['match', ['get', 'iso_3166_1']]
  for (const stance of APPETITE_STANCE_ORDER) {
    const group = codes.filter((c) => byCode[c] === stance)
    if (group.length) expr.push(group, STANCE_COLORS[stance])
  }
  expr.push('rgba(0,0,0,0)')
  return expr
}

const fillOpacityExpr = (): any => ['case', ['boolean', ['feature-state', 'hover'], false], 0.85, 0.5]

const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] as unknown[] }

const toFeatureCollection = (shapes: RegionShapeFeature[]) => ({
  type: 'FeatureCollection' as const,
  features: shapes
    .filter((s) => s.geometry)
    .map((s, i) => ({
      type: 'Feature' as const,
      id: i,
      properties: { entry: s.entry, appetiteStance: s.appetiteStance ?? '' },
      geometry: s.geometry,
    })),
})

// State/city overlay fill: match the feature's stance property to its color.
const appetiteShapeColorExpr = (): any => {
  const expr: any[] = ['match', ['get', 'appetiteStance']]
  for (const stance of APPETITE_STANCE_ORDER) expr.push(stance, STANCE_COLORS[stance])
  expr.push(STANCE_UNSET_COLOR)
  return expr
}

export type RegionAppetiteMapProps = {
  /** Per-jurisdiction graded appetite stance — the single classification the map
   *  edits (replaces the old preferred/excluded pair). Keyed by encoded entry. */
  stances: JurisdictionStances
  /** Called with a fresh stance map whenever a region is clicked, picked or added. */
  onStancesChange: (next: JurisdictionStances) => void
  /** Fetched state/city boundaries to overlay (the container resolves these). */
  shapes?: RegionShapeFeature[]
  /** Injected place search (keeps this component API-free). Returns picker options. */
  onSearch?: (query: string) => Promise<RegionSearchOption[]>
  /**
   * Injected reverse-resolver: given a clicked point and the zoom-derived
   * granularity, return the encoded jurisdiction entry (e.g. "US/Florida") to
   * toggle — or null. This is what gives state/city specificity when clicking the
   * map (the base tileset only has country polygons).
   */
  onResolvePoint?: (lng: number, lat: number, kind: 'state' | 'city') => Promise<string | null>
  /** When set, the map flies to this [w,s,e,n] (e.g. a newly-displayed shape). */
  focusBbox?: [number, number, number, number] | null
  /** Opens the per-region limits tear sheet (Regional settings) for an entry. */
  onOpenLimits?: (entry: string) => void
  /**
   * Capacity utilization (0–100) per jurisdiction entry, keyed case-insensitively.
   * Surfaced inline beside each overlay row so capacity reads in the same view as
   * appetite — no separate layer toggle.
   */
  utilizationByEntry?: Record<string, number>
  height?: number
  className?: string
}

const Root = styled.div`
  border-radius: ${radii.lg}px;
  overflow: hidden;
  border: 1px solid ${colors.outlineVariant};
  background: ${colors.surfaceContainerLow};
`

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${spacing.md}px;
  padding: ${spacing.sm}px ${spacing.md}px;
  border-bottom: 1px solid ${colors.outlineVariant};
  flex-wrap: wrap;
`

const Legend = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.md}px;
  flex-wrap: wrap;
`

const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${spacing.xs}px;
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.xs}px;
  color: ${colors.onSurfaceVariant};
`

const Swatch = styled.span<{ $color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background: ${(p) => p.$color};
  display: inline-block;
`

const Hint = styled.span`
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.xs}px;
  color: ${colors.outline};
`

const GranularityChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${spacing.xs}px;
  padding: 2px 8px;
  border-radius: ${radii.round}px;
  background: ${withAlpha(colors.primary, 0.14)};
  color: ${colors.primarySoft};
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.xs}px;
  font-weight: ${typography.weights.semibold};
  white-space: nowrap;
`

const ClearButton = styled.button`
  border: 1px solid ${colors.outlineVariant};
  background: transparent;
  color: ${colors.onSurfaceVariant};
  border-radius: ${radii.md}px;
  padding: 4px 10px;
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.xs}px;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${colors.surfaceContainerHigh};
    color: ${colors.onSurface};
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`

const SearchWrap = styled.div`
  position: relative;
  flex: 1 1 220px;
  min-width: 180px;
  max-width: 360px;
`

const SearchInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 6px 10px;
  border-radius: ${radii.md}px;
  border: 1px solid ${colors.outlineVariant};
  background: ${colors.surfaceContainerHigh};
  color: ${colors.onSurface};
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.sm}px;

  &::placeholder {
    color: ${colors.outline};
  }
  &:focus {
    outline: none;
    border-color: ${withAlpha(colors.primary, 0.6)};
  }
`

const Dropdown = styled.ul`
  position: absolute;
  z-index: 5;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  margin: 0;
  padding: 4px;
  list-style: none;
  max-height: 240px;
  overflow-y: auto;
  background: ${colors.surfaceContainerHigh};
  border: 1px solid ${colors.outlineVariant};
  border-radius: ${radii.md}px;
  box-shadow: 0 12px 32px ${withAlpha(colors.scrim, 0.4)};
`

const Option = styled.li`
  padding: 8px 10px;
  border-radius: ${radii.sm}px;
  cursor: pointer;
  font-family: ${typography.fontFamily};

  &:hover {
    background: ${withAlpha(colors.primary, 0.12)};
  }
`

const OptionLabel = styled.div`
  font-size: ${typography.sizes.sm}px;
  color: ${colors.onSurfaceStrong};
`

const OptionSub = styled.div`
  font-size: ${typography.sizes.xs}px;
  color: ${colors.onSurfaceVariant};
`

const MapStage = styled.div`
  position: relative;
`

const Canvas = styled.div<{ $height: number }>`
  width: 100%;
  height: ${(p) => p.$height}px;
`

/** Floating panel overlaid on the map listing the classified regions, grouped by
 *  appetite stance. Kept compact (content-height, capped) so it never blankets the
 *  map or swallows clicks meant for the regions underneath it. */
const OverlayList = styled.div`
  position: absolute;
  top: ${spacing.md}px;
  left: ${spacing.md}px;
  z-index: 2;
  width: 210px;
  display: flex;
  flex-direction: column;
  background: ${withAlpha(colors.surfaceContainerLow, 0.92)};
  border: 1px solid ${colors.outlineVariant};
  border-radius: ${radii.md}px;
  box-shadow: 0 12px 32px ${withAlpha(colors.scrim, 0.4)};
  backdrop-filter: blur(6px);
  overflow: hidden;
`

const OverlayScroll = styled.div`
  overflow-y: auto;
  max-height: 220px;
  padding: ${spacing.xs}px;
`

const OverlayGroupLabel = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.xs}px;
  padding: ${spacing.xs}px ${spacing.sm}px 2px;
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.xs}px;
  font-weight: ${typography.weights.semibold};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${colors.onSurfaceVariant};
`

const OverlayRow = styled.div<{ $clickable?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${spacing.xs}px;
  width: 100%;
  box-sizing: border-box;
  padding: 4px ${spacing.sm}px;
  border: none;
  background: transparent;
  border-radius: ${radii.sm}px;
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.sm}px;
  text-align: left;
  color: ${colors.onSurface};
  cursor: ${(p) => (p.$clickable ? 'pointer' : 'default')};

  &:hover {
    background: ${colors.surfaceContainerHigh};
  }
`

const OverlayName = styled.span<{ $clickable?: boolean }>`
  flex: 1 1 auto;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border: none;
  background: transparent;
  padding: 0;
  margin: 0;
  font: inherit;
  text-align: left;
  color: inherit;
  cursor: ${(p) => (p.$clickable ? 'pointer' : 'default')};

  &:hover {
    text-decoration: ${(p) => (p.$clickable ? 'underline' : 'none')};
  }
`

// Inline capacity readout beside a region, tinted by how close it is to its cap.
const UtilTag = styled.span<{ $tone: 'gain' | 'tertiary' | 'danger' }>`
  flex: 0 0 auto;
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.xs}px;
  font-variant-numeric: tabular-nums;
  color: ${({ $tone }) =>
    $tone === 'danger' ? colors.dangerBright : $tone === 'tertiary' ? colors.dataViz.amber : colors.accentStrong};
`

const OverlayRemove = styled.button`
  flex: 0 0 auto;
  border: none;
  background: transparent;
  color: ${colors.onSurfaceVariant};
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 2px 4px;
  border-radius: ${radii.sm}px;

  &:hover {
    background: ${withAlpha(colors.dangerBright, 0.18)};
    color: ${colors.onSurface};
  }
`

const OverlayEmpty = styled.div`
  padding: ${spacing.sm}px;
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.xs}px;
  color: ${colors.onSurfaceVariant};
`

/** Transparent click-catcher that dismisses the right-click menu on an outside click. */
const MenuBackdrop = styled.div`
  position: absolute;
  inset: 0;
  z-index: 3;
`

/** Right-click options menu (pick an appetite stance / Regional settings) for a region. */
const ContextMenu = styled.div`
  position: absolute;
  z-index: 4;
  min-width: 188px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  background: ${colors.surfaceContainerHigh};
  border: 1px solid ${colors.outlineVariant};
  border-radius: ${radii.md}px;
  box-shadow: 0 12px 32px ${withAlpha(colors.scrim, 0.45)};
`

const ContextMenuLabel = styled.div`
  padding: 6px 10px 6px;
  margin-bottom: 4px;
  border-bottom: 1px solid ${colors.outlineVariant};
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.xs}px;
  font-weight: ${typography.weights.semibold};
  color: ${colors.onSurfaceVariant};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 240px;
`

const ContextMenuItem = styled.button`
  display: flex;
  align-items: center;
  gap: ${spacing.sm}px;
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
  padding: 7px 10px;
  border-radius: ${radii.sm}px;
  cursor: pointer;
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.sm}px;
  color: ${colors.onSurface};

  &:hover {
    background: ${withAlpha(colors.primary, 0.12)};
  }
`

const TokenMessage = styled.div<{ $height: number }>`
  height: ${(p) => p.$height}px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: ${spacing.lg}px;
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.sm}px;
  color: ${colors.onSurfaceVariant};
`

/**
 * Interactive graded-appetite map for Geographic Appetite. Every region carries a
 * single appetite stance (target → acceptable → restricted → refer → decline) —
 * this replaces the old binary include/exclude model.
 *
 * - Countries are drawn from the Mapbox country tileset; click one to advance its
 *   stance along the ramp (neutral → target → … → decline → neutral), or
 *   right-click to pick a stance directly.
 * - State/province and city boundaries are supplied via `shapes` (the container
 *   fetches them from `/api/geolocation/shape`) and overlaid coloured by stance;
 *   click an overlay to cycle it too.
 * - The search box (driven by the injected `onSearch`) adds a region at Target.
 *
 * Pure/presentational: all stance logic lives in `regionAppetite`, and data
 * fetching is injected — this component only owns the Mapbox instance.
 */
export const RegionAppetiteMap: React.FC<RegionAppetiteMapProps> = ({
  stances,
  onStancesChange,
  shapes = [],
  onSearch,
  onResolvePoint,
  focusBbox,
  onOpenLimits,
  utilizationByEntry = {},
  height = 420,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const readyRef = useRef(false)
  const hoveredRef = useRef<string | number | null>(null)

  // Granularity a click targets, derived from the current zoom.
  const [granularity, setGranularity] = useState<ClickGranularity>('country')
  const [resolving, setResolving] = useState(false)

  // Right-click options menu: canvas-relative position + the region it acts on.
  const [menu, setMenu] = useState<{ x: number; y: number; entry: string } | null>(null)

  // Latest props/state for the imperative click handlers (registered once).
  const propsRef = useRef({ stances, onStancesChange })
  propsRef.current = { stances, onStancesChange }
  const granularityRef = useRef(granularity)
  granularityRef.current = granularity
  const resolveRef = useRef(onResolvePoint)
  resolveRef.current = onResolvePoint

  // Latest shapes so the async map-load handler can seed overlays resolved early.
  const shapesRef = useRef(shapes)
  shapesRef.current = shapes

  const onOpenLimitsRef = useRef(onOpenLimits)
  onOpenLimitsRef.current = onOpenLimits

  // Left-click advances a region's stance one step along the ramp.
  const handleEntryRef = useRef<(entry: string) => void>(() => {})
  handleEntryRef.current = (entry: string) => {
    const cur = propsRef.current
    cur.onStancesChange(cycleStanceFor(entry, cur.stances))
  }

  // Open/close the right-click menu from the once-registered imperative handlers.
  const openMenuRef = useRef<(x: number, y: number, entry: string) => void>(() => {})
  openMenuRef.current = (x, y, entry) => setMenu({ x, y, entry })
  const closeMenuRef = useRef<() => void>(() => {})
  closeMenuRef.current = () => setMenu(null)

  // Country-code → stance pairs for the tileset fill expression.
  const countryStanceMap = countryStances(stances)

  // ── Search box state ──
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<RegionSearchOption[]>([])
  const [searching, setSearching] = useState(false)

  // Debounced search via the injected resolver.
  useEffect(() => {
    if (!onSearch) return
    const q = query.trim()
    if (q.length < 2) {
      setOptions([])
      return
    }
    let cancelled = false
    setSearching(true)
    const handle = window.setTimeout(() => {
      void onSearch(q)
        .then((opts) => {
          if (!cancelled) setOptions(opts)
        })
        .catch(() => {
          if (!cancelled) setOptions([])
        })
        .finally(() => {
          if (!cancelled) setSearching(false)
        })
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [query, onSearch])

  // A picked search result is added at the most-favorable stance (Target); the
  // underwriter can then cycle/downgrade it from the map or the right-click menu.
  const addEntry = (entry: string) => {
    const cur = propsRef.current
    cur.onStancesChange(setStance(entry, 'target', cur.stances))
    setQuery('')
    setOptions([])
  }

  // One-time map setup.
  useEffect(() => {
    if (!containerRef.current || mapRef.current || !MAPBOX_TOKEN) return

    mapboxgl.accessToken = MAPBOX_TOKEN
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [10, 25],
      zoom: 1.1,
      projection: { name: 'mercator' } as any,
    })
    mapRef.current = map
    // Right-click is the options menu here, not a rotate gesture (this is a flat
    // appetite map — rotation/pitch add nothing and would swallow the context menu).
    map.dragRotate.disable()
    map.touchZoomRotate.disableRotation()
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    map.on('error', (e: any) => console.error('RegionAppetiteMap error:', e))

    map.on('load', () => {
      map.addSource(SRC, { type: 'vector', url: COUNTRIES_URL })
      map.addLayer({
        id: FILL,
        type: 'fill',
        source: SRC,
        'source-layer': SRC_LAYER,
        filter: WORLDVIEW_FILTER,
        paint: {
          'fill-color': countryStanceColorExpr(countryStances(propsRef.current.stances)),
          'fill-opacity': fillOpacityExpr(),
        } as any,
      } as any)
      map.addLayer({
        id: LINE,
        type: 'line',
        source: SRC,
        'source-layer': SRC_LAYER,
        filter: WORLDVIEW_FILTER,
        paint: { 'line-color': hexToRgba(rawColors.outline, 0.6), 'line-width': 0.4 } as any,
      } as any)

      // Overlay source + layers for fetched state/city shapes (drawn on top).
      map.addSource(SHAPE_SRC, { type: 'geojson', data: EMPTY_FC as any })
      const shapeColor = appetiteShapeColorExpr()
      map.addLayer({
        id: SHAPE_FILL,
        type: 'fill',
        source: SHAPE_SRC,
        paint: { 'fill-color': shapeColor, 'fill-opacity': 0.6 } as any,
      } as any)
      map.addLayer({
        id: SHAPE_LINE,
        type: 'line',
        source: SHAPE_SRC,
        paint: { 'line-color': shapeColor, 'line-width': 1.2 } as any,
      } as any)

      readyRef.current = true
      // Track the zoom-derived click granularity.
      const updateGranularity = () => setGranularity(granularityForZoom(map.getZoom()))
      updateGranularity()
      map.on('zoomend', updateGranularity)
      // Populate overlays that were already resolved before the map finished loading.
      ;(map.getSource(SHAPE_SRC) as mapboxgl.GeoJSONSource | undefined)?.setData(
        toFeatureCollection(shapesRef.current) as any,
      )

      const setHover = (id: string | number | null) => {
        if (hoveredRef.current !== null) {
          map.setFeatureState({ source: SRC, sourceLayer: SRC_LAYER, id: hoveredRef.current }, { hover: false })
        }
        hoveredRef.current = id
        if (id !== null) map.setFeatureState({ source: SRC, sourceLayer: SRC_LAYER, id }, { hover: true })
      }

      map.on('mousemove', FILL, (e: any) => {
        map.getCanvas().style.cursor = 'pointer'
        const f = e.features?.[0]
        if (f && f.id !== undefined) setHover(f.id)
      })
      map.on('mouseleave', FILL, () => {
        map.getCanvas().style.cursor = ''
        setHover(null)
      })

      map.on('mouseenter', SHAPE_FILL, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', SHAPE_FILL, () => {
        map.getCanvas().style.cursor = ''
      })

      // Resolve the jurisdiction entry under a pointer event so a click ALWAYS
      // lands on a region — even where the country tileset has no feature under the
      // cursor (ocean, a gap, or the tileset still loading). Resolution order:
      //   1. a drawn state/city overlay under the cursor → its entry
      //   2. the country from the tileset (instant, no network)
      //   3. reverse-geocode the point (state/city specificity, tileset-miss fallback)
      // Shared by left-click (cycle) and right-click (options menu) so both agree.
      const resolveEntryAt = async (e: any): Promise<string | null> => {
        if (map.getLayer(SHAPE_FILL)) {
          const overlayHere = map.queryRenderedFeatures(e.point, { layers: [SHAPE_FILL] })
          const overlayEntry = overlayHere?.[0]?.properties?.entry
          if (overlayEntry) return String(overlayEntry)
        }

        const g = granularityRef.current
        const countryHere = map.getLayer(FILL) ? map.queryRenderedFeatures(e.point, { layers: [FILL] }) : []
        const fallbackCode = countryHere?.[0]?.properties?.iso_3166_1
        if (g === 'country' && fallbackCode) return String(fallbackCode)

        const resolve = resolveRef.current
        if (!resolve) return fallbackCode ? String(fallbackCode) : null
        setResolving(true)
        try {
          // A country-zoom click that missed the tileset still benefits from a
          // reverse lookup (it resolves at least the country); ask for 'state'.
          const entry = await resolve(e.lngLat.lng, e.lngLat.lat, g === 'country' ? 'state' : g)
          return entry ?? (fallbackCode ? String(fallbackCode) : null)
        } catch {
          return fallbackCode ? String(fallbackCode) : null
        } finally {
          setResolving(false)
        }
      }

      // Left-click advances the region's stance one step along the ramp.
      map.on('click', async (e: any) => {
        closeMenuRef.current()
        const entry = await resolveEntryAt(e)
        if (entry) handleEntryRef.current(entry)
      })

      // Right-click opens a small options menu (pick a stance / Regional settings)
      // anchored at the cursor, clamped to stay inside the map canvas.
      map.on('contextmenu', async (e: any) => {
        e.preventDefault?.()
        e.originalEvent?.preventDefault?.()
        const entry = await resolveEntryAt(e)
        if (!entry) return
        const canvas = map.getCanvas()
        const MENU_W = 196
        const MENU_H = 210
        const x = Math.max(8, Math.min(e.point.x, canvas.clientWidth - MENU_W))
        const y = Math.max(8, Math.min(e.point.y, canvas.clientHeight - MENU_H))
        openMenuRef.current(x, y, entry)
      })
    })

    return () => {
      readyRef.current = false
      hoveredRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Repaint countries when the stance map changes.
  const countryStanceKey = Object.entries(countryStanceMap)
    .map(([code, stance]) => `${code}:${stance}`)
    .sort()
    .join(',')
  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current || !map.getLayer(FILL)) return
    map.setPaintProperty(FILL, 'fill-color', countryStanceColorExpr(countryStanceMap))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryStanceKey])

  // Push fetched state/city boundaries into the overlay source.
  const shapesKey = shapes.map((s) => `${s.entry}:${s.appetiteStance ?? ''}:${s.geometry ? 1 : 0}`).join('|')
  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    const src = map.getSource(SHAPE_SRC) as mapboxgl.GeoJSONSource | undefined
    src?.setData(toFeatureCollection(shapes) as any)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapesKey])

  // Fly to a requested bounding box (e.g. a region just added).
  const bboxKey = focusBbox ? focusBbox.join(',') : ''
  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current || !focusBbox) return
    map.fitBounds([[focusBbox[0], focusBbox[1]], [focusBbox[2], focusBbox[3]]], { padding: 40, duration: 800, maxZoom: 8 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bboxKey])

  const clearAll = () => {
    onStancesChange({})
  }

  const removeEntry = (entry: string) => {
    const cur = propsRef.current
    cur.onStancesChange(setStance(entry, null, cur.stances))
  }

  // Explicitly set a region's stance (the right-click menu picks one directly,
  // unlike the left-click ramp cycle).
  const setEntryStance = (entry: string, stance: AppetiteStance) => {
    const cur = propsRef.current
    cur.onStancesChange(setStance(entry, stance, cur.stances))
  }

  // Dismiss the right-click menu on Escape.
  useEffect(() => {
    if (!menu) return
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setMenu(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menu])

  const hasSelection = Object.keys(stances).length > 0

  // The overlay lists every classified region, bucketed by graded appetite stance
  // (most → least favorable). A trailing "Unset" bucket catches regions with no
  // recognized stance.
  const stancesKey = JSON.stringify(stances)
  const overlayGroups = useMemo(() => {
    const buckets = new Map<AppetiteStance | 'unset', string[]>()
    for (const [entry, stance] of Object.entries(stances)) {
      const key = normalizeStance(stance) ?? 'unset'
      const list = buckets.get(key)
      if (list) list.push(entry)
      else buckets.set(key, [entry])
    }
    const ordered: { key: string; label: string; color: string; entries: string[] }[] = []
    for (const stance of APPETITE_STANCE_ORDER) {
      const entries = buckets.get(stance)
      if (entries?.length) {
        ordered.push({ key: stance, label: APPETITE_STANCE_LABEL[stance], color: STANCE_COLORS[stance], entries })
      }
    }
    const unset = buckets.get('unset')
    if (unset?.length) {
      ordered.push({ key: 'unset', label: 'Unset', color: STANCE_UNSET_COLOR, entries: unset })
    }
    return ordered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stancesKey])

  // Per-stance counts for the legend key.
  const stanceCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of Object.values(stances)) {
      const k = normalizeStance(s)
      if (k) counts[k] = (counts[k] ?? 0) + 1
    }
    return counts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stancesKey])

  // Case-insensitive capacity-utilization lookup for an overlay row (0–100 or null).
  const utilFor = (entry: string): number | null => {
    const v = utilizationByEntry[entry.trim().toLowerCase()]
    return typeof v === 'number' ? v : null
  }
  const utilTone = (pct: number): 'gain' | 'tertiary' | 'danger' =>
    pct >= 85 ? 'danger' : pct >= 60 ? 'tertiary' : 'gain'

  return (
    <Root className={className}>
      <Toolbar>
        <Legend>
          {APPETITE_STANCE_ORDER.map((stance) => (
            <LegendItem key={stance}>
              <Swatch $color={STANCE_COLORS[stance]} /> {APPETITE_STANCE_LABEL[stance]} ({stanceCounts[stance] ?? 0})
            </LegendItem>
          ))}
          <GranularityChip aria-live="polite">
            {resolving ? 'Resolving…' : `Click adds: ${GRANULARITY_LABEL[granularity]}`}
          </GranularityChip>
          <Hint>Zoom in for state &amp; city · click to cycle stance · right-click to choose</Hint>
        </Legend>
        {onSearch && (
          <SearchWrap>
            <SearchInput
              type="text"
              value={query}
              placeholder="Search a country, state or city…"
              aria-label="Search for a region to add"
              onChange={(e) => setQuery(e.target.value)}
            />
            {options.length > 0 && (
              <Dropdown role="listbox">
                {options.map((opt) => (
                  <Option key={opt.entry} role="option" onClick={() => addEntry(opt.entry)}>
                    <OptionLabel>{opt.label}</OptionLabel>
                    {opt.sublabel && <OptionSub>{opt.sublabel}</OptionSub>}
                  </Option>
                ))}
              </Dropdown>
            )}
            {searching && query.trim().length >= 2 && options.length === 0 && (
              <Dropdown role="listbox">
                <Option as="li" style={{ cursor: 'default' }}>
                  <OptionSub>Searching…</OptionSub>
                </Option>
              </Dropdown>
            )}
          </SearchWrap>
        )}
        <ClearButton type="button" onClick={clearAll} disabled={!hasSelection}>
          Clear all
        </ClearButton>
      </Toolbar>
      {MAPBOX_TOKEN ? (
        <MapStage>
          <Canvas ref={containerRef} $height={height} />
          <OverlayList aria-label="Regions by appetite stance">
            <OverlayScroll>
              {overlayGroups.length === 0 ? (
                <OverlayEmpty>Click the map to set a region’s appetite stance.</OverlayEmpty>
              ) : (
                overlayGroups.map((group) => (
                  <React.Fragment key={group.key}>
                    <OverlayGroupLabel>
                      <Swatch $color={group.color} /> {group.label} ({group.entries.length})
                    </OverlayGroupLabel>
                    {group.entries.map((entry) => {
                      const util = utilFor(entry)
                      return (
                        <OverlayRow key={`${group.key}-${entry}`}>
                          <OverlayName
                            as={onOpenLimits ? 'button' : 'span'}
                            type={onOpenLimits ? 'button' : undefined}
                            $clickable={!!onOpenLimits}
                            title={onOpenLimits ? `${regionLabel(entry)} — regional settings` : entry}
                            onClick={onOpenLimits ? () => onOpenLimits(entry) : undefined}
                          >
                            {regionLabel(entry)}
                          </OverlayName>
                          {util != null && (
                            <UtilTag $tone={utilTone(util)} title={`${util}% of capacity used`}>
                              {util}%
                            </UtilTag>
                          )}
                          <OverlayRemove
                            type="button"
                            aria-label={`Remove ${regionLabel(entry)}`}
                            onClick={() => removeEntry(entry)}
                          >
                            ×
                          </OverlayRemove>
                        </OverlayRow>
                      )
                    })}
                  </React.Fragment>
                ))
              )}
            </OverlayScroll>
          </OverlayList>
          {menu && (
            <>
              <MenuBackdrop
                onClick={() => setMenu(null)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setMenu(null)
                }}
              />
              <ContextMenu style={{ left: menu.x, top: menu.y }} role="menu" aria-label="Region options">
                <ContextMenuLabel title={menu.entry}>{regionLabel(menu.entry)}</ContextMenuLabel>
                {APPETITE_STANCE_ORDER.map((stance) => (
                  <ContextMenuItem
                    key={stance}
                    type="button"
                    role="menuitemradio"
                    aria-checked={stanceOf(menu.entry, stances) === stance}
                    onClick={() => {
                      setEntryStance(menu.entry, stance)
                      setMenu(null)
                    }}
                  >
                    <Swatch $color={STANCE_COLORS[stance]} /> {APPETITE_STANCE_LABEL[stance]}
                    {stanceOf(menu.entry, stances) === stance && <span aria-hidden="true" style={{ marginLeft: 'auto' }}>✓</span>}
                  </ContextMenuItem>
                ))}
                {stanceOf(menu.entry, stances) !== null && (
                  <ContextMenuItem
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      removeEntry(menu.entry)
                      setMenu(null)
                    }}
                  >
                    <span aria-hidden="true">×</span> Clear
                  </ContextMenuItem>
                )}
                {onOpenLimits && (
                  <ContextMenuItem
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onOpenLimits(menu.entry)
                      setMenu(null)
                    }}
                  >
                    <span aria-hidden="true">⚙</span> Regional settings
                  </ContextMenuItem>
                )}
              </ContextMenu>
            </>
          )}
        </MapStage>
      ) : (
        <TokenMessage $height={height}>
          No Mapbox token configured. Add <code>&nbsp;VITE_MAPBOX_TOKEN&nbsp;</code> to your .env and
          restart the dev server to enable the geographic appetite map.
        </TokenMessage>
      )}
    </Root>
  )
}

export default RegionAppetiteMap
