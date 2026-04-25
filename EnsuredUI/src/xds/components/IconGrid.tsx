import React from 'react'
import { colors } from '../colors'

export const IconGrid: React.FC<{ items: { label: string; icon?: React.ReactNode }[] }> = ({ items }) => {
  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', background: colors.surfaceContainerLow, padding: 20, borderRadius: 12 }}>
      {items.map((it) => (
        <div key={it.label} style={{ width: 72, textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, margin: '0 auto 8px', background: colors.surfaceContainerHigh, color: colors.primary }}>{it.icon ?? '◎'}</div>
          <div style={{ fontSize: 10, fontFamily: 'ui-monospace, Menlo, monospace', color: colors.onSurfaceVariant }}>{it.label}</div>
        </div>
      ))}
    </div>
  )
}

export default IconGrid
