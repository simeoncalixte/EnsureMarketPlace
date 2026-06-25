import React from 'react'
import styled, { css } from 'styled-components'
import { colors } from '../colors'
import { radii, typography } from '../tokens'

export type XdsButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'text'
export type XdsButtonTone = 'default' | 'success' | 'warning' | 'danger'
export type XdsButtonSize = 'sm' | 'md'

export type XdsButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: XdsButtonVariant
  tone?: XdsButtonTone
  size?: XdsButtonSize
}

type StyledButtonProps = {
  $variant: XdsButtonVariant
  $tone: XdsButtonTone
  $size: XdsButtonSize
}

// Map a tone to a solid accent color used for filled/outline/text emphasis.
const toneColor = (tone: XdsButtonTone): string => {
  switch (tone) {
    case 'success':
      return colors.success
    case 'warning':
      return colors.warning
    case 'danger':
      return colors.danger
    case 'default':
    default:
      return colors.brand[500]
  }
}

// Preserve the EXACT original computed styles for primary/secondary/ghost when
// tone is left at its default. Tone (when set) and the additive variants layer
// on top without disturbing the legacy defaults.
const variantStyles = (variant: XdsButtonVariant, tone: XdsButtonTone) => {
  const accent = toneColor(tone)
  const tinted = tone !== 'default'

  switch (variant) {
    case 'primary':
      return css`
        background: ${tinted ? accent : colors.brand[500]};
        color: ${colors.white};
        border: none;
      `
    case 'secondary':
      return css`
        background: ${tinted ? accent : colors.neutral[300]};
        color: ${tinted ? colors.white : colors.text.primary};
        border: none;
      `
    case 'ghost':
      return css`
        background: transparent;
        color: ${tinted ? accent : colors.text.primary};
        border: 1px solid transparent;
      `
    case 'outline':
      return css`
        background: transparent;
        color: ${tinted ? accent : colors.text.primary};
        border: 1px solid ${tinted ? accent : colors.neutral[300]};
      `
    case 'text':
      return css`
        background: transparent;
        color: ${tinted ? accent : colors.brand[500]};
        border: none;
      `
    default:
      return css``
  }
}

const sizeStyles = (size: XdsButtonSize) => {
  // 'md' preserves the original 8px 14px padding and default font size.
  switch (size) {
    case 'sm':
      return css`
        padding: 4px 10px;
        font-size: ${typography.sizes.xs}px;
      `
    case 'md':
    default:
      return css`
        padding: 8px 14px;
      `
  }
}

const StyledButton = styled.button<StyledButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
  border-radius: ${radii.md}px;
  cursor: pointer;
  font-weight: ${typography.weights.semibold};
  font-family: Inter, system-ui, sans-serif;
  ${({ $variant, $tone }) => variantStyles($variant, $tone)}
  ${({ $size }) => sizeStyles($size)}

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`

export const Button: React.FC<XdsButtonProps> = ({
  variant = 'primary',
  tone = 'default',
  size = 'md',
  children,
  ...rest
}) => {
  return (
    <StyledButton $variant={variant} $tone={tone} $size={size} {...rest}>
      {children}
    </StyledButton>
  )
}

export default Button
