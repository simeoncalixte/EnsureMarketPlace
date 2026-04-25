import React from 'react'
import { colors } from '../colors'

export const ProgressBar: React.FC<{ value: number }> = ({ value }) => {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div style={{ width: '100%', background: colors.surfaceContainerHigh, height: 12, borderRadius: 9999, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, background: colors.secondary, height: '100%' }} />
    </div>
  )
}

export default ProgressBar
