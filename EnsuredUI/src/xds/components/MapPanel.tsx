import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { colors } from '../colors'
import { radii } from '../tokens'


export const MapPanel: React.FC<{
  title?: string
  stats?: Array<{ label: string; value: string }>
  points?: Array<{ latitude: number; longitude: number; label?: string }>
}> = ({ title, stats = [], points = [] }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [is3D, setIs3D] = useState(false)

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
                'fill-extrusion-color': '#aaa',
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
      if (mapContainer.current) mapContainer.current.innerHTML = '<div style="padding:16px;color:#fff;background:#111;">No Mapbox token configured. Add VITE_MAPBOX_TOKEN in your .env and restart the dev server.</div>'
      return
    }

    // Preflight the Mapbox style to detect 401s; fall back to a public style if unauthorized
    const styleUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11?access_token=${MAPBOX_TOKEN}`
    const fallbackStyle = 'https://demotiles.maplibre.org/style.json'
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
            // Try using the provided fallback Mapbox token
            console.warn('Primary Mapbox token unauthorized; trying fallback token')
            mapboxgl.accessToken = FALLBACK_MAPBOX_TOKEN
            // initialize map using Mapbox style with fallback token
            const map = new mapboxgl.Map({
              container: mapContainer.current as HTMLDivElement,
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
            if (is3D) apply3D(map, true)
            return
          }

          if (mapContainer.current)
            mapContainer.current.innerHTML = '<div style="padding:12px;color:#fff;background:#111;">Mapbox token unauthorized (401). Provide a valid `VITE_MAPBOX_TOKEN` or `VITE_MAPBOX_FALLBACK_TOKEN` in your .env.</div>'
          return
        }

        // authorized — use mapbox style
        const map = new mapboxgl.Map({
          container: mapContainer.current as HTMLDivElement,
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
        if (is3D) apply3D(map, true)
      })
      .catch((err) => {
        if (aborted) return
        console.error('Preflight style error:', err)
        if (mapContainer.current) mapContainer.current.innerHTML = `<div style="padding:12px;color:#fff;background:#111;">Map error: ${String(err)}</div>`
      })

    return () => {
      aborted = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [points])

  return (
    <div style={{ borderRadius: radii.lg, overflow: 'hidden', border: `1px solid ${colors.outlineVariant}`, background: colors.surfaceContainerLow }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr' }}>
        <div style={{ padding: 32, borderRight: `1px solid ${colors.outlineVariant}` }}>
          {title && <h3 style={{ margin: 0, color: colors.text.primary }}>{title}</h3>}
          <p style={{ color: colors.onSurfaceVariant, marginTop: 12 }}>Oracles verify real-world events across the globe. Our ledger settles payouts within blocks of confirmed data arrival.</p>
          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => setIs3D((s) => !s)}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid rgba(0,0,0,0.12)',
                background: is3D ? '#0b7285' : '#fff',
                color: is3D ? '#fff' : '#000',
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

        <div style={{ position: 'relative', minHeight: 320 }}>
          <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
    </div>
  )
}

export default MapPanel
