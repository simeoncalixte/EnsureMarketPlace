import React from 'react'
import { colors } from '../colors'

export const HeroHeader: React.FC<{ title?: string; subtitle?: string; tag?: string }> = ({ title, subtitle, tag }) => {
  return (
    <header style={{margin: '0 auto' }}>
      {tag && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 9999, background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.outlineVariant}`, marginBottom: 16 }}>
          <span style={{ width: 8, height: 8, borderRadius: 8, background: colors.secondary }} />
          <span style={{ fontSize: 10, fontFamily: 'ui-monospace, Menlo, monospace', textTransform: 'uppercase', letterSpacing: 1, color: colors.onSurfaceVariant }}>{tag}</span>
        </div>
      )}

      <h1 style={{ fontSize: 48, lineHeight: 1.02, margin: 0, color: colors.text.primary, fontWeight: 800 }}>{title}</h1>
      {subtitle && <p style={{ marginTop: 12, color: colors.onSurfaceVariant, fontSize: 18, maxWidth: 720 }}>{subtitle}</p>}
    </header>
  )
}

export default HeroHeader
