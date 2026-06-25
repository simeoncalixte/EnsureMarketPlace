import React from 'react'
import { colors } from '../colors'
import Checkbox from './Checkbox'
import type { MapLayerDef } from './mapLayers'

export type LayerControlBarProps = {
  layers: MapLayerDef[]
  enabled: Record<string, boolean>
  counts: Record<string, number | null>
  facets: Record<string, string[]>
  onToggle: (id: string) => void
  onToggleFacet: (layerId: string, value: string) => void
}

// Horizontal layer + facet toolbar shown at the top of the map (the default control surface for
// hosts that don't supply their own).
export const LayerControlBar: React.FC<LayerControlBarProps> = ({
  layers,
  enabled,
  counts,
  facets,
  onToggle,
  onToggleFacet,
}) => (
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
          <Checkbox label={layer.label} checked={Boolean(enabled[layer.id])} onChange={() => onToggle(layer.id)} />
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

export default LayerControlBar
