import React from 'react'
import { colors, withAlpha } from '../colors'

export type MapInfoColumnProps = {
  title?: string
  description?: string
  stats: Array<{ label: string; value: string }>
  /** When the host doesn't control 3D mode, the column renders the flat/3D toggle button. */
  showToggle: boolean
  is3D: boolean
  onToggle3D: () => void
}

// Left-hand info column: title, description, optional 3D toggle and a list of stats.
export const MapInfoColumn: React.FC<MapInfoColumnProps> = ({
  title,
  description,
  stats,
  showToggle,
  is3D,
  onToggle3D,
}) => (
  <div style={{ padding: 32, borderRight: `1px solid ${colors.outlineVariant}`, overflowY: 'auto' }}>
    {title && <h3 style={{ margin: 0, color: colors.text.primary }}>{title}</h3>}
    {description && <p style={{ color: colors.onSurfaceVariant, marginTop: 12 }}>{description}</p>}
    {showToggle && (
      <div style={{ marginTop: 12 }}>
        <button
          onClick={onToggle3D}
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
)

export default MapInfoColumn
