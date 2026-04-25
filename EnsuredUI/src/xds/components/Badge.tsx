import React from 'react'
import { colors } from '../colors'

export const Badge: React.FC<{ variant?: 'primary' | 'surface' | 'secondary' | 'tertiary'; children?: React.ReactNode }> = ({ variant = 'surface', children }) => {
  const styles: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1,
    display: 'inline-block'
  }

  if (variant === 'primary') return <span style={{ ...styles, background: 'rgba(75,142,255,0.12)', color: colors.primary, border: `1px solid rgba(75,142,255,0.2)` }}>{children}</span>
  if (variant === 'secondary') return <span style={{ ...styles, background: 'rgba(34,197,94,0.08)', color: colors.secondary, border: `1px solid rgba(34,197,94,0.12)` }}>{children}</span>
  if (variant === 'tertiary') return <span style={{ ...styles, background: colors.tertiaryContainer, color: colors.onSurfaceVariant, border: `1px solid rgba(148,163,184,0.08)` }}>{children}</span>

  return <span style={{ ...styles, background: colors.surfaceContainerHigh, color: colors.onSurfaceVariant, border: `1px solid ${colors.outlineVariant}` }}>{children}</span>
}

export default Badge
