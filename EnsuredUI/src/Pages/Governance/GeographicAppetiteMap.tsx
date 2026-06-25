import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import RegionAppetiteMap from '../../xds/components/RegionAppetiteMap'
import {
  deriveRegionRef,
  parseRegionRef,
  shapeEntriesFromStances,
  stanceOf,
  type JurisdictionStances,
  type RegionSearchOption,
  type RegionShapeFeature,
} from '../../xds/components/regionAppetite'
import { fetchShape, reverseGeocode, searchPlaces } from '../../api/geolocation'
import {
  getCapacityLayer,
  getLocationLimits,
  type CapacityLayer,
  type LocationLimit,
} from '../../api/governance'
import { loadLineOfBusinessTaxonomy } from '../../api/marketplace'
import LocationLimitsTearSheet from './LocationLimitsTearSheet'

export type GeographicAppetiteMapProps = {
  /** Per-jurisdiction graded appetite stance (the single geographic-appetite model). */
  stances: JurisdictionStances
  onStancesChange: (next: JurisdictionStances) => void
  /** Org whose capacity definition owns the per-location limits + capacity layer. */
  organizationId: number | null
  /** Active capacity definition the per-location limits hang off. */
  capacityDefinitionId: number | null
  currency?: string
  height?: number
}

const ALL_LINES = { value: '*', label: 'All lines' }

/**
 * Data-wired container for the Geographic Appetite map (Governance module).
 *
 * Keeps the xds `RegionAppetiteMap` pure: resolves jurisdiction entries to
 * boundaries via `/api/geolocation/shape`, drives the search box via
 * `/api/geolocation/search`, and reverse-resolves clicks via `/reverse`. A single
 * stance-coloured view — capacity utilization (from `/governance/capacity-layer`)
 * is surfaced inline per region rather than as a separate toggled layer, and the
 * per-location limits tear sheet (LOB × location) persists via the governance
 * location-limits API (scoped to the active capacity definition).
 */
export const GeographicAppetiteMap: React.FC<GeographicAppetiteMapProps> = ({
  stances,
  onStancesChange,
  organizationId,
  capacityDefinitionId,
  currency = 'USD',
  height = 440,
}) => {
  const [shapes, setShapes] = useState<RegionShapeFeature[]>([])
  const [focusBbox, setFocusBbox] = useState<[number, number, number, number] | null>(null)

  const [lobOptions, setLobOptions] = useState<{ value: string; label: string }[]>([ALL_LINES])
  const [limits, setLimits] = useState<LocationLimit[]>([])
  const [capacity, setCapacity] = useState<CapacityLayer>({ regions: [], warnings: [] })
  const [tearEntry, setTearEntry] = useState<string | null>(null)

  // Per-entry geometry/bbox cache (entry key → geometry|null, and → bbox|null).
  const geomCache = useRef<Map<string, unknown>>(new Map())
  const bboxCache = useRef<Map<string, [number, number, number, number] | null>>(new Map())

  const limitsEnabled = organizationId != null && capacityDefinitionId != null

  // ── LOB taxonomy (once) ──
  useEffect(() => {
    void loadLineOfBusinessTaxonomy()
      .then((tax) => setLobOptions([ALL_LINES, ...tax.map((t) => ({ value: t.code, label: t.label }))]))
      .catch(() => setLobOptions([ALL_LINES]))
  }, [])

  // ── Limits + capacity layer (reloadable; all lines) ──
  const reload = useCallback(async () => {
    if (organizationId == null || capacityDefinitionId == null) {
      setLimits([])
      setCapacity({ regions: [], warnings: [] })
      return
    }
    const [lims, layer] = await Promise.all([
      getLocationLimits(organizationId, capacityDefinitionId).catch(() => [] as LocationLimit[]),
      getCapacityLayer(organizationId).catch(() => ({ regions: [], warnings: [] }) as CapacityLayer),
    ])
    setLimits(lims)
    setCapacity(layer)
  }, [organizationId, capacityDefinitionId])

  useEffect(() => {
    void reload()
  }, [reload])

  // ── Appetite-mode shapes (per-stance state & city overlays) ──
  const entries = shapeEntriesFromStances(stances)
  const entriesSig = entries.join('|')
  const stateSig = entries.map((e) => stanceOf(e, stances) ?? '').join('|')

  const resolveGeometry = useCallback(async (entry: string): Promise<unknown> => {
    const ref = parseRegionRef(entry)
    if (!ref) return null
    const key = entry.toLowerCase()
    if (!geomCache.current.has(key)) {
      try {
        const feature = await fetchShape(ref.kind, ref.ref, { country: ref.countryCode, state: ref.state })
        geomCache.current.set(key, feature.geometry ?? null)
        bboxCache.current.set(key, feature.properties?.bbox ?? null)
        if (feature.geometry && feature.properties?.bbox) setFocusBbox(feature.properties.bbox)
      } catch {
        geomCache.current.set(key, null)
      }
    }
    return geomCache.current.get(key) ?? null
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const resolved: RegionShapeFeature[] = []
      for (const entry of entries) {
        const geometry = await resolveGeometry(entry)
        if (geometry) {
          resolved.push({ entry, appetiteStance: stanceOf(entry, stances), geometry })
        }
      }
      if (!cancelled) setShapes(resolved)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entriesSig, stateSig])

  // Capacity utilization per jurisdiction (highest across lines), keyed lowercase
  // for the inline overlay readout. Surfaces capacity in the same stance view.
  const utilizationByEntry = useMemo(() => {
    const out: Record<string, number> = {}
    for (const r of capacity.regions) {
      if (r.utilizationPct == null) continue
      const key = r.entry.toLowerCase()
      out[key] = Math.max(out[key] ?? 0, Math.round(r.utilizationPct))
    }
    return out
  }, [capacity.regions])

  const onResolvePoint = useCallback(async (lng: number, lat: number, kind: 'state' | 'city') => {
    const res = await reverseGeocode(lat, lng)
    const r = res.result
    if (!r || !r.countryCode) return null
    const cc = r.countryCode.toUpperCase()
    if (kind === 'city') {
      if (r.city && r.state) return `${cc}/${r.state}/${r.city}`
      if (r.state) return `${cc}/${r.state}`
      return cc
    }
    if (r.state) return `${cc}/${r.state}`
    return cc
  }, [])

  const onSearch = useCallback(async (q: string): Promise<RegionSearchOption[]> => {
    const res = await searchPlaces(q, { limit: 6 })
    const out: RegionSearchOption[] = []
    const seen = new Set<string>()
    for (const c of res.candidates) {
      const entry = deriveRegionRef(c)
      if (!entry) continue
      const dedupe = entry.toLowerCase()
      if (seen.has(dedupe)) continue
      seen.add(dedupe)
      const label = c.city || c.state || c.countryCode || entry
      const sublabel = [c.city ? c.state : null, c.countryCode].filter(Boolean).join(', ')
      out.push({ label: String(label), sublabel: sublabel || undefined, entry })
    }
    return out
  }, [])

  return (
    <>
      <RegionAppetiteMap
        stances={stances}
        onStancesChange={onStancesChange}
        shapes={shapes}
        onSearch={onSearch}
        onResolvePoint={onResolvePoint}
        focusBbox={focusBbox}
        onOpenLimits={limitsEnabled ? setTearEntry : undefined}
        utilizationByEntry={utilizationByEntry}
        height={height}
      />
      {limitsEnabled && (
        <LocationLimitsTearSheet
          open={tearEntry != null}
          entry={tearEntry}
          organizationId={organizationId as number}
          capacityDefinitionId={capacityDefinitionId as number}
          lobOptions={lobOptions}
          limits={limits}
          capacityRegions={capacity.regions}
          currency={currency}
          onClose={() => setTearEntry(null)}
          onSaved={reload}
        />
      )}
    </>
  )
}

export default GeographicAppetiteMap
