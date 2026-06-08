import mapboxgl from 'mapbox-gl'
import { colors } from '../colors'
import { getCrestaZones } from '../../api/crestaZones'
import { getActiveEvents, getFaultLines } from '../../api/riskLayers'

/**
 * Map layer registry.
 *
 * Each toggleable overlay on the map is described by a `MapLayerDef`. The MapPanel engine owns the
 * generic lifecycle — fetch data, create/refresh the GeoJSON source, toggle visibility, render a
 * control-panel row — while each definition's `install()` owns its own layers, paint and popups.
 *
 * To add a new layer: append a definition to `MAP_LAYERS`. The source id is the def `id`; layers it
 * creates should be prefixed with that id (e.g. `${id}-fill`).
 */

export type Visibility = 'visible' | 'none'

export interface LayerFilterOption {
  value: string
  label: string
}

/**
 * Optional in-layer faceted filter (e.g. event type). The panel renders one checkbox per option;
 * MapPanel calls `apply()` with the currently-selected values so the def can `setFilter` its own
 * mapbox layers (composing with any base filter it owns).
 */
export interface LayerFilterDef {
  /** Heading above the facet checkboxes. */
  label?: string
  options: LayerFilterOption[]
  /** Apply the selected option values to this layer's mapbox layers. */
  apply: (map: mapboxgl.Map, selected: string[]) => void
}

export interface MapLayerDef {
  /** Unique key; also used as the GeoJSON source id. */
  id: string
  /** Control-panel label. */
  label: string
  /** Whether the layer starts visible. */
  defaultEnabled: boolean
  /** Optional auto-refresh interval (ms). Omit for static layers. */
  refreshMs?: number
  /** Fetch the layer's GeoJSON FeatureCollection. */
  fetchData: () => Promise<any>
  /** Add this layer's mapbox layers + interactivity. Called once; returns the created layer ids. */
  install: (map: mapboxgl.Map, sourceId: string, visibility: Visibility) => string[]
  /** Status note rendered under the label, given the loaded feature count (null while loading). */
  note: (count: number | null) => string
  /** Optional faceted filter (checkboxes) applied to this layer's features. */
  filter?: LayerFilterDef
}

// --- CRESTA zones -------------------------------------------------------------------------------

const CRESTA_ID = 'cresta-zones'
const CRESTA_FILL = 'cresta-zones-fill'
const CRESTA_LINE = 'cresta-zones-outline'
const CRESTA_POINT = 'cresta-zones-point'
const CRESTA_LABEL = 'cresta-zones-label'

const crestaLayer: MapLayerDef = {
  id: CRESTA_ID,
  label: 'CRESTA Zones (2019)',
  defaultEnabled: true,
  fetchData: () => getCrestaZones<any>(),
  note: (count) =>
    count === null
      ? 'Loading…'
      : count === 0
        ? 'No zone boundaries loaded yet'
        : `${count} zone${count === 1 ? '' : 's'}`,
  install: (map, sourceId, visibility) => {
    // Polygon boundary fill + outline (only render when real geometry is loaded).
    map.addLayer({
      id: CRESTA_FILL,
      type: 'fill',
      source: sourceId,
      filter: ['==', ['geometry-type'], 'Polygon'] as any,
      layout: { visibility },
      paint: {
        'fill-color': ['match', ['get', 'resolution'], 'high', colors.dataViz.cyanDeep, colors.primary] as any,
        'fill-opacity': 0.25,
      },
    })
    map.addLayer({
      id: CRESTA_LINE,
      type: 'line',
      source: sourceId,
      filter: ['==', ['geometry-type'], 'Polygon'] as any,
      layout: { visibility },
      paint: { 'line-color': colors.dataViz.cyanDeep, 'line-width': 1 },
    })
    // Country-centroid points for zones without boundary geometry (approximate coverage).
    map.addLayer({
      id: CRESTA_POINT,
      type: 'circle',
      source: sourceId,
      filter: ['==', ['geometry-type'], 'Point'] as any,
      layout: { visibility },
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 3, 6, 8] as any,
        'circle-color': ['match', ['get', 'resolution'], 'high', colors.dataViz.cyanDeep, colors.primary] as any,
        'circle-opacity': 0.75,
        'circle-stroke-width': 1,
        'circle-stroke-color': colors.white,
      },
    })
    // Text label (from the DB, not the base style): country name on top, zone code below.
    map.addLayer({
      id: CRESTA_LABEL,
      type: 'symbol',
      source: sourceId,
      layout: {
        visibility,
        'text-field': [
          'format',
          ['coalesce', ['get', 'name'], ['get', 'countryName'], ''], { 'font-scale': 1.0 },
          '\n', {},
          ['get', 'code'], { 'font-scale': 0.85 },
        ] as any,
        'text-size': 12,
        'text-anchor': 'bottom',
        'text-offset': [0, -1.1] as any,
        'text-line-height': 1.2,
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': colors.dataViz.cyanDeep,
        'text-halo-color': colors.white,
        'text-halo-width': 1.5,
      },
    })

    const showPopup = (e: any) => {
      const f = e.features && e.features[0]
      if (!f) return
      const p = f.properties || {}
      const name = p.name ?? p.countryName ?? ''
      const level = p.level === 'city' ? 'city' : p.level === 'state_province' ? 'state/province' : (p.level ?? '')
      new mapboxgl.Popup({ offset: 8 })
        .setLngLat(e.lngLat)
        .setHTML(
          `<strong>${name}</strong><br/>${p.code ?? ''}<br/>` +
            `${p.countryIso3 ?? ''}${level ? ` · ${level}` : ''}`,
        )
        .addTo(map)
    }
    ;[CRESTA_FILL, CRESTA_POINT].forEach((layerId) => {
      map.on('click', layerId, showPopup)
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = ''
      })
    })

    return [CRESTA_FILL, CRESTA_LINE, CRESTA_POINT, CRESTA_LABEL]
  },
}

// --- Active events (live catastrophe feeds) -----------------------------------------------------

const EVENTS_ID = 'active-events'
const EVENTS_POINT = 'active-events-point'
const EVENTS_LABEL = 'active-events-label'

// Severity ramp shared by the circle fill and the popup chip — keyed by `severityLevel`.
const SEVERITY_COLOR = [
  'match',
  ['get', 'severityLevel'],
  'severe', colors.dataViz.red,
  'high', colors.dataViz.orange,
  'moderate', colors.dataViz.amber,
  'low', colors.dataViz.green,
  colors.dataViz.green,
] as any

const activeEventsLayer: MapLayerDef = {
  id: EVENTS_ID,
  label: 'Active Events (live)',
  defaultEnabled: false,
  refreshMs: 5 * 60_000,
  fetchData: () => getActiveEvents<any>(),
  note: (count) =>
    count === null
      ? 'Loading…'
      : count === 0
        ? 'No active events'
        : `${count} active event${count === 1 ? '' : 's'}`,
  // Filter the live events by peril type. `apply` rewrites the point + label layers' filter to only
  // keep features whose `peril` is in the selected set (empty selection → nothing shown).
  filter: {
    label: 'Event type',
    options: [
      { value: 'earthquake', label: 'Earthquakes' },
      { value: 'hurricane', label: 'Cyclones' },
    ],
    apply: (map, selected) => {
      const expr = ['in', ['get', 'peril'], ['literal', selected]] as any
      ;[EVENTS_POINT, EVENTS_LABEL].forEach((id) => {
        if (map.getLayer(id)) map.setFilter(id, expr)
      })
    },
  },
  install: (map, sourceId, visibility) => {
    // Severity-coloured circle sized by the normalised severity (0–100).
    map.addLayer({
      id: EVENTS_POINT,
      type: 'circle',
      source: sourceId,
      layout: { visibility },
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'severity'], 0, 5, 100, 18] as any,
        'circle-color': SEVERITY_COLOR,
        'circle-opacity': 0.8,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': colors.white,
      },
    })
    // Title label above each event, shown once the user zooms in a little.
    map.addLayer({
      id: EVENTS_LABEL,
      type: 'symbol',
      source: sourceId,
      minzoom: 3,
      layout: {
        visibility,
        'text-field': ['get', 'title'] as any,
        'text-size': 11,
        'text-anchor': 'top',
        'text-offset': [0, 0.8] as any,
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': colors.neutral[900],
        'text-halo-color': colors.white,
        'text-halo-width': 1.5,
      },
    })

    // Build the popup body from an event feature's properties. `withLink` is only used for the
    // persistent click popup — the hover popup is transient, so an anchor there can't be clicked.
    const buildHtml = (p: any, withLink: boolean) => {
      const when = p.ts ? new Date(p.ts).toLocaleString() : ''
      const peril = typeof p.peril === 'string' ? p.peril : ''
      const link = withLink && p.url ? `<br/><a href="${p.url}" target="_blank" rel="noreferrer">Details ↗</a>` : ''
      return (
        `<strong>${p.title ?? 'Event'}</strong><br/>` +
        `${p.detail ?? ''}${peril ? ` · ${peril}` : ''}<br/>` +
        `${p.place ? `${p.place}<br/>` : ''}` +
        `<span style="color:${colors.neutral[500]}">${p.source ?? ''}${when ? ` · ${when}` : ''}</span>` +
        link
      )
    }

    // Persistent popup on click — keeps the "Details ↗" link clickable.
    map.on('click', EVENTS_POINT, (e: any) => {
      const f = e.features && e.features[0]
      if (!f) return
      new mapboxgl.Popup({ offset: 8 }).setLngLat(e.lngLat).setHTML(buildHtml(f.properties || {}, true)).addTo(map)
    })

    // Transient hover popup that follows the cursor, so events are legible without clicking.
    const hoverPopup = new mapboxgl.Popup({ offset: 8, closeButton: false, closeOnClick: false })
    map.on('mouseenter', EVENTS_POINT, () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mousemove', EVENTS_POINT, (e: any) => {
      const f = e.features && e.features[0]
      if (!f) return
      hoverPopup.setLngLat(e.lngLat).setHTML(buildHtml(f.properties || {}, false)).addTo(map)
    })
    map.on('mouseleave', EVENTS_POINT, () => {
      map.getCanvas().style.cursor = ''
      hoverPopup.remove()
    })

    return [EVENTS_POINT, EVENTS_LABEL]
  },
}

// --- Fault lines (seismic hazard) ---------------------------------------------------------------

const FAULTS_ID = 'fault-lines'
const FAULTS_LINE = 'fault-lines-line'
const FAULTS_CASING = 'fault-lines-casing'

// Hazard ramp keyed by net slip rate (mm/yr): faster strain accumulation → higher risk.
const FAULT_COLOR = [
  'interpolate',
  ['linear'],
  ['get', 'slipRate'],
  0, colors.dataViz.green,
  1, colors.dataViz.amber,
  5, colors.dataViz.orange,
  15, colors.dataViz.red,
] as any

const faultLinesLayer: MapLayerDef = {
  id: FAULTS_ID,
  label: 'Fault Lines (seismic)',
  defaultEnabled: false,
  fetchData: () => getFaultLines<any>(),
  note: (count) =>
    count === null
      ? 'Loading…'
      : count === 0
        ? 'No fault data'
        : `${count.toLocaleString()} fault${count === 1 ? '' : 's'} · slip-rate hazard`,
  install: (map, sourceId, visibility) => {
    // Dark casing underneath gives the coloured line contrast over any basemap.
    map.addLayer({
      id: FAULTS_CASING,
      type: 'line',
      source: sourceId,
      layout: { visibility, 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': colors.neutral[900],
        'line-opacity': 0.35,
        'line-width': ['interpolate', ['linear'], ['zoom'], 2, 1.6, 8, 4.5] as any,
      },
    })
    // Slip-rate-coloured fault trace; thicker where strain accumulates faster.
    map.addLayer({
      id: FAULTS_LINE,
      type: 'line',
      source: sourceId,
      layout: { visibility, 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': FAULT_COLOR,
        'line-opacity': 0.85,
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          2, ['interpolate', ['linear'], ['get', 'slipRate'], 0, 0.6, 15, 2.2],
          8, ['interpolate', ['linear'], ['get', 'slipRate'], 0, 1.5, 15, 5],
        ] as any,
      },
    })

    const showPopup = (e: any) => {
      const f = e.features && e.features[0]
      if (!f) return
      const p = f.properties || {}
      const slip = p.slipRate != null && p.slipRate !== '' ? `${Number(p.slipRate).toFixed(2)} mm/yr` : 'unknown'
      new mapboxgl.Popup({ offset: 8 })
        .setLngLat(e.lngLat)
        .setHTML(
          `<strong>${p.name ?? 'Unnamed fault'}</strong><br/>` +
            `${p.slipType ? `${p.slipType} · ` : ''}slip rate ${slip}<br/>` +
            `<span style="color:${colors.neutral[500]}">${p.catalog ?? 'GEM'} · ${p.hazardLevel ?? ''} hazard</span>`,
        )
        .addTo(map)
    }
    map.on('click', FAULTS_LINE, showPopup)
    map.on('mouseenter', FAULTS_LINE, () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', FAULTS_LINE, () => {
      map.getCanvas().style.cursor = ''
    })

    return [FAULTS_CASING, FAULTS_LINE]
  },
}

export const MAP_LAYERS: MapLayerDef[] = [crestaLayer, activeEventsLayer, faultLinesLayer]
