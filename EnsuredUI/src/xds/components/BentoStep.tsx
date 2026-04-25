import React from 'react'
import { colors } from '../colors'
import { radii } from '../tokens'

export const BentoStep: React.FC<{
  index: number
  title: string
  body: React.ReactNode
  icon?: React.ReactNode
  accent?: string
}> = ({ index, title, body, icon, accent }) => {
  return (
    <div style={{ background: colors.surfaceContainerLow, padding: 24, borderRadius: radii.lg, borderLeft: `4px solid ${accent ?? colors.primary}` }}>
      <div style={{ marginBottom: 12, color: accent ?? colors.primary, fontSize: 28 }}>{icon ?? <span style={{ fontWeight: 800 }}>{String(index).padStart(2, '0')}</span>}</div>
      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: colors.text.primary }}>{title}</h3>
      <p style={{ marginTop: 8, color: colors.onSurfaceVariant }}>{body}</p>
    </div>
  )
}

export default BentoStep
