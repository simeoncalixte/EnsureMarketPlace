import React from 'react'
import { colors } from '../colors'
import { radii } from '../tokens'

export const BentoStep: React.FC<{
  index: number
  title: string
  body: React.ReactNode
  icon?: React.ReactNode
  accent?: string
  /** Decorative SVG rendered behind the content; receives the step accent via currentColor. */
  decoration?: React.ReactNode
}> = ({ index, title, body, icon, accent, decoration }) => {
  const accentColor = accent ?? colors.primary
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: colors.surfaceContainerLow,
        padding: 24,
        borderRadius: radii.lg,
        borderLeft: `4px solid ${accentColor}`,
      }}
    >
      {decoration ? (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 180,
            height: 180,
            color: accentColor,
            opacity: 0.16,
            pointerEvents: 'none',
          }}
        >
          {decoration}
        </div>
      ) : null}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: 12, color: accentColor, fontSize: 28 }}>{icon ?? <span style={{ fontWeight: 800 }}>{String(index).padStart(2, '0')}</span>}</div>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: colors.text.primary }}>{title}</h3>
        <p style={{ marginTop: 8, color: colors.onSurfaceVariant }}>{body}</p>
      </div>
    </div>
  )
}

export default BentoStep
