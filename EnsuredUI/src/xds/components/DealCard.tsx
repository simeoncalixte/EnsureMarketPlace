import React from 'react'
import { colors } from '../colors'
import { radii } from '../tokens'

export const DealCard: React.FC<{
  title: string
  subtitle?: string
  yieldText?: string
  capacity?: string
  riskLevel?: number
}> = ({ title, subtitle, yieldText, capacity, riskLevel = 2 }) => {
  const bars = Array.from({ length: 3 }).map((_, i) => ({ active: i < riskLevel }))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 120px 140px', gap: 12, alignItems: 'center', padding: 12, background: colors.surfaceContainer, borderRadius: radii.md, border: `1px solid ${colors.outlineVariant}` }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: radii.md, background: colors.surfaceContainerHighest, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: colors.secondary }} aria-hidden>🌩️</span>
        </div>
        <div>
          <div style={{ fontWeight: 700, color: colors.text.primary }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: colors.onSurfaceVariant }}>{subtitle}</div>}
        </div>
      </div>

      <div style={{ color: colors.secondary, fontFamily: 'ui-monospace, Menlo, monospace' }}>{yieldText}</div>
      <div style={{ color: colors.text.primary }}>{capacity}</div>
      <div>
        <div style={{ display: 'flex', gap: 6 }}>
          {bars.map((b, i) => (
            <div key={i} style={{ height: 8, width: 24, borderRadius: 6, background: b.active ? colors.primary : colors.outlineVariant }} />
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <button style={{ padding: '6px 10px', background: colors.surfaceContainerHighest, color: colors.primary, border: 'none', borderRadius: 6, fontWeight: 700 }}>INVEST NOW</button>
      </div>
    </div>
  )
}

export default DealCard
