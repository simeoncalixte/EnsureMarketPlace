import React from 'react'
import { colors } from '../colors'
import { radii } from '../tokens'

export const MetricCard: React.FC<{
  label: string
  value: string
  delta?: string
  accent?: string
}> = ({ label, value, delta, accent }) => {
  return (
    <div style={{ background: colors.surfaceContainerLow, padding: 20, borderRadius: radii.md, transition: 'background 150ms', border: `1px solid ${colors.outlineVariant}` }}>
      <div style={{ fontSize: 11, fontFamily: 'ui-monospace, Menlo, monospace', textTransform: 'uppercase', letterSpacing: 1, color: colors.onSurfaceVariant }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 28, fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 700, color: accent ?? colors.primary }}>{value}</div>
      {delta && (
        <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center', color: colors.text.secondary, fontSize: 13 }}>
          <span style={{ opacity: 0.9 }}>{delta}</span>
        </div>
      )}
    </div>
  )
}

export default MetricCard
