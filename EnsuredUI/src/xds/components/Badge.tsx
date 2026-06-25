import React from 'react'
import styled, { css } from 'styled-components'
import { colors, withAlpha } from '../colors'
import { radii, typography } from '../tokens'

/**
 * Existing variants (backward-compatible) plus additive semantic tones.
 * - primary / secondary / tertiary / surface: original variants, unchanged styling.
 * - success / warning / danger / info / neutral: new semantic tones mapped to colors.ts.
 */
export type XdsBadgeVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'surface'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'

export type XdsBadgeProps = {
  variant?: XdsBadgeVariant
  /** Optional leading dot rendered before the children. */
  dot?: boolean
  children?: React.ReactNode
  className?: string
}

// Backwards-compatible alias.
export type BadgeProps = XdsBadgeProps

type VariantTheme = {
  background: string
  color: string
  border: string
}

// Translucent fills/borders derive from the solid semantic tokens via
// `withAlpha` (color-mix), so badge tones stay theme-reactive.
const variantThemes: Record<XdsBadgeVariant, VariantTheme> = {
  // --- Original variants: preserve exact computed styles ---
  primary: {
    background: withAlpha(colors.primary, 0.12),
    color: colors.primary,
    border: `1px solid ${withAlpha(colors.primary, 0.2)}`
  },
  secondary: {
    background: withAlpha(colors.dataViz.green, 0.08),
    color: colors.secondary,
    border: `1px solid ${withAlpha(colors.dataViz.green, 0.12)}`
  },
  tertiary: {
    background: colors.tertiaryContainer,
    color: colors.onSurfaceVariant,
    border: `1px solid ${withAlpha(colors.neutral[400], 0.08)}`
  },
  surface: {
    background: colors.surfaceContainerHigh,
    color: colors.onSurfaceVariant,
    border: `1px solid ${colors.outlineVariant}`
  },

  // --- New semantic tones mapped to colors.ts ---
  success: {
    background: withAlpha(colors.success, 0.12),
    color: colors.success,
    border: `1px solid ${withAlpha(colors.success, 0.2)}`
  },
  warning: {
    background: withAlpha(colors.warning, 0.12),
    color: colors.warning,
    border: `1px solid ${withAlpha(colors.warning, 0.2)}`
  },
  danger: {
    background: withAlpha(colors.danger, 0.12),
    color: colors.danger,
    border: `1px solid ${withAlpha(colors.danger, 0.2)}`
  },
  info: {
    background: withAlpha(colors.info, 0.12),
    color: colors.info,
    border: `1px solid ${withAlpha(colors.info, 0.2)}`
  },
  neutral: {
    background: colors.surfaceContainerHigh,
    color: colors.onSurfaceVariant,
    border: `1px solid ${colors.outlineVariant}`
  }
}

const StyledBadge = styled.span<{ $variant: XdsBadgeVariant }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: ${radii.md}px;
  font-size: ${typography.sizes.xs}px;
  font-weight: ${typography.weights.bold};
  text-transform: uppercase;
  letter-spacing: 1px;

  ${({ $variant }: { $variant: XdsBadgeVariant }) => {
    const theme = variantThemes[$variant]
    return css`
      background: ${theme.background};
      color: ${theme.color};
      border: ${theme.border};
    `
  }}
`

const Dot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: ${radii.round}px;
  background: currentColor;
  flex: 0 0 auto;
`

export const Badge: React.FC<XdsBadgeProps> = ({
  variant = 'surface',
  dot = false,
  children,
  className
}) => {
  return (
    <StyledBadge $variant={variant} className={className}>
      {dot ? <Dot aria-hidden="true" /> : null}
      {children}
    </StyledBadge>
  )
}

export default Badge
