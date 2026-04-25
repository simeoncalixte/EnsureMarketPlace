import React from 'react'
import { colors } from '../colors'

export interface InfoCardProps {
  title: string
  value: string
  tone?: 'primary' | 'secondary'
}

const InfoCard: React.FC<InfoCardProps> = ({ title, value, tone = 'primary' }) => {
  const accent = tone === 'primary' ? colors.primary : colors.secondary
  return (
    <div style={{ background: colors.surfaceContainerLow, padding: 18, borderRadius: 10, borderBottom: `1px solid ${colors.outlineVariant}`, transition: 'background 0.2s' }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', color: colors.onSurfaceVariant, letterSpacing: 1 }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: colors.onSurface }}>{value}</div>
        <div style={{ fontSize: 12, color: accent }}>{tone === 'primary' ? 'STABLE' : '+0.42%'}</div>
      </div>
    </div>
  )
}

export default InfoCard
