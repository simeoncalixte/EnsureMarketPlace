import React from 'react'
import { colors } from '../colors'

export const StatCard: React.FC<{ label: string; value: string; delta?: string }> = ({ label, value, delta }) => {
  return (
    <div>
      <div style={{ fontSize: 10, fontFamily: 'ui-monospace, Menlo, monospace', textTransform: 'uppercase', color: colors.onSurfaceVariant }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: colors.text.primary }}>{value}</div>
      {delta && <div style={{ fontSize: 12, color: colors.secondary, fontFamily: 'ui-monospace, Menlo, monospace' }}>{delta}</div>}
    </div>
  )
}

export default StatCard
