import React from 'react'
import styled, { css } from 'styled-components'
import { colors, withAlpha } from '../colors'
import { radii, spacing } from '../tokens'

/**
 * Card surface container.
 *
 * Backward-compatible:
 * - `elevated` keeps its exact original visuals (raised surface fill #2d3449).
 * - Default (non-elevated) keeps its exact original visuals (base surface fill #171f33).
 * - `style`, `className` and all native div attributes still forward through.
 *
 * Additive (all optional, default to the original look):
 * - `variant`: surface treatment — 'surface' (default), 'elevated', 'outline', 'low', 'high'.
 *   The original `elevated` prop takes precedence when set, for backwards compatibility.
 * - `tone`: optional semantic accent border — 'none' (default), 'success', 'warning', 'danger', 'info'.
 * - `interactive`: when true the card becomes a button-like surface (role/tabindex/hover/focus).
 *   Combine with the native `onClick`/`onKeyDown` handlers that already forward through.
 */
export type XdsCardVariant = 'surface' | 'elevated' | 'outline' | 'low' | 'high'

export type XdsCardTone = 'none' | 'success' | 'warning' | 'danger' | 'info'

export type CardProps = {
  /** Original prop: renders the raised surface fill. Kept for backwards compatibility. */
  elevated?: boolean
  /** Additive surface treatment. Ignored visually when `elevated` is true. */
  variant?: XdsCardVariant
  /** Additive semantic accent applied to the border. */
  tone?: XdsCardTone
  /** When true, the card is keyboard/pointer interactive (role=button, focusable, hover/focus affordances). */
  interactive?: boolean
  children?: React.ReactNode
  style?: React.CSSProperties
} & React.HTMLAttributes<HTMLDivElement>

// Backwards-compatible alias.
export type XdsCardProps = CardProps

// Original literal surface colors preserved exactly so existing pages render pixel-identical.
const ORIGINAL_SURFACE = colors.surfaceRaised
const ORIGINAL_ELEVATED = colors.surfaceElevated
const ORIGINAL_BORDER = withAlpha(colors.white, 0.05)

const variantBackground: Record<XdsCardVariant, string> = {
  surface: ORIGINAL_SURFACE,
  elevated: ORIGINAL_ELEVATED,
  outline: 'transparent',
  low: colors.surfaceContainerLow,
  high: colors.surfaceContainerHigh
}

const toneBorder: Record<XdsCardTone, string> = {
  none: ORIGINAL_BORDER,
  success: withAlpha(colors.success, 0.4),
  warning: withAlpha(colors.warning, 0.4),
  danger: withAlpha(colors.danger, 0.4),
  info: withAlpha(colors.info, 0.4)
}

type StyledCardProps = {
  $variant: XdsCardVariant
  $tone: XdsCardTone
  $interactive: boolean
}

const StyledCard = styled.div<StyledCardProps>`
  background: ${(p: StyledCardProps) => variantBackground[p.$variant]};
  padding: ${spacing.lg}px;
  border-radius: ${radii.lg}px;
  border: 1px solid ${(p: StyledCardProps) => toneBorder[p.$tone]};
  transition: border-color 0.2s;

  ${(p: StyledCardProps) =>
    p.$interactive &&
    css`
      cursor: pointer;
      outline: none;

      &:hover {
        border-color: ${colors.primary};
      }

      &:focus-visible {
        border-color: ${colors.primary};
        box-shadow: 0 0 0 2px ${withAlpha(colors.primary, 0.4)};
      }
    `}
`

export const Card: React.FC<CardProps> = ({
  elevated = false,
  variant,
  tone = 'none',
  interactive = false,
  children,
  onKeyDown,
  ...rest
}) => {
  // `elevated` wins for backwards compatibility; otherwise fall back to variant/surface.
  const resolvedVariant: XdsCardVariant = elevated ? 'elevated' : variant ?? 'surface'

  // Interactive cards behave like a button for keyboard users (Enter/Space) while
  // still honoring any forwarded onKeyDown handler first.
  const handleKeyDown = interactive
    ? (event: React.KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(event)
        if (event.defaultPrevented) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          event.currentTarget.click()
        }
      }
    : onKeyDown

  const interactiveProps = interactive ? { role: 'button' as const, tabIndex: 0 } : {}

  return (
    <StyledCard
      $variant={resolvedVariant}
      $tone={tone}
      $interactive={interactive}
      onKeyDown={handleKeyDown}
      {...interactiveProps}
      {...rest}
    >
      {children}
    </StyledCard>
  )
}

export default Card
