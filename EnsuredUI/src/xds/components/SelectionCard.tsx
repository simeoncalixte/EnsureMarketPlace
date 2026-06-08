import React from 'react'
import styled, { css } from 'styled-components'
import { colors, withAlpha } from '../colors'
import { radii, spacing, typography } from '../tokens'

export interface SelectionCardProps {
  selectionId?: string
  title: string
  subtitle?: string
  icon?: React.ReactNode
  accentColor?: string
  active?: boolean
  onClick?: () => void
  onSelect?: (selectionId: string) => void
  children?: React.ReactNode
  footerLabel?: string
  ctaText?: string
  /** Additive: disable interaction. Renders non-interactive and dims the card. */
  disabled?: boolean
  /** Additive: pass-through className for layout composition. */
  className?: string
  /** Additive: forwarded test id for the root element. */
  'data-testid'?: string
}

/**
 * Transient props for the styled root. Prefixed with `$` so styled-components
 * does not forward them to the DOM.
 */
interface RootProps {
  $active?: boolean
  $accentColor?: string
  $disabled?: boolean
}

const Root = styled.div<RootProps>`
  position: relative;
  border-radius: 16px;
  padding: 28px;
  background: ${colors.surfaceContainer};
  box-shadow: 0 8px 30px ${withAlpha(colors.scrim, 0.6)};
  display: flex;
  flex-direction: column;
  min-height: 360px;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  border: 1px solid transparent;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
  outline: none;

  ${({ $disabled }) =>
    $disabled &&
    css`
      opacity: 0.55;
    `}

  ${({ $active, $accentColor }) =>
    $active &&
    css`
      border-color: ${$accentColor || colors.primary};
      box-shadow: 0 8px 30px ${withAlpha(colors.scrim, 0.6)}, 0 0 0 1px ${$accentColor || colors.primary};
    `}

  &:hover {
    ${({ $disabled, $accentColor }) =>
      !$disabled &&
      css`
        border-color: ${$accentColor || colors.primary};
      `}
  }

  &:focus-visible {
    border-color: ${({ $accentColor }) => $accentColor || colors.primary};
    box-shadow: 0 8px 30px ${withAlpha(colors.scrim, 0.6)}, 0 0 0 2px ${({ $accentColor }) => $accentColor || colors.primary};
  }
`

const Overlay = styled.div`
  border-radius: ${radii.lg}px;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: ${spacing.lg / 2}px;
`

const HeaderLeft = styled.div`
  display: flex;
  gap: ${spacing.lg / 2}px;
  align-items: center;
`

const IconBox = styled.div`
  width: 56px;
  height: 56px;
  border-radius: ${radii.lg}px;
  background: ${colors.surfaceContainerHigh};
  display: flex;
  align-items: center;
  justify-content: center;
`

const Subtitle = styled.div<{ $accentColor?: string }>`
  font-size: ${typography.sizes.xs}px;
  text-transform: uppercase;
  color: ${({ $accentColor }) => $accentColor || colors.primary};
  font-family: 'JetBrains Mono', monospace;
`

const Title = styled.h2`
  font-size: 26px;
  margin: ${spacing.sm}px 0;
  font-weight: 800;
`

const Body = styled.div`
  color: ${colors.onSurfaceVariant};
  margin-bottom: 18px;
`

const Slot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: auto;
`

const Footer = styled.div`
  margin-top: 18px;
  border-top: 1px solid ${colors.outlineVariant};
  padding-top: ${spacing.md}px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const FooterLabel = styled.div`
  font-size: ${typography.sizes.xs}px;
  color: ${colors.onSurfaceVariant};
  font-style: italic;
`

const Cta = styled.div<{ $accentColor?: string }>`
  display: flex;
  gap: ${spacing.sm}px;
  align-items: center;
  color: ${({ $accentColor }) => $accentColor || colors.primary};
  font-weight: 700;
`

const CtaText = styled.span`
  font-size: ${typography.sizes.sm}px;
`

const CtaArrow = styled.span<{ $accentColor?: string }>`
  color: ${({ $accentColor }) => $accentColor || colors.primary};
`

const AccentLine = styled.div``

const SelectionCard: React.FC<SelectionCardProps> = ({
  selectionId,
  title,
  subtitle,
  icon,
  accentColor,
  active,
  onClick,
  onSelect,
  children,
  footerLabel,
  ctaText,
  disabled,
  className,
  'data-testid': dataTestId,
}) => {
  const handleActivate = () => {
    if (disabled) return
    if (selectionId && onSelect) {
      onSelect(selectionId)
    }
    onClick?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleActivate()
    }
  }

  return (
    <Root
      className={`selection-card ${active ? 'active' : ''} ${className || ''}`.trim()}
      $active={active}
      $accentColor={accentColor}
      $disabled={disabled}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={active}
      aria-disabled={disabled}
      data-testid={dataTestId}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
    >
      <Overlay className="card-overlay" />
      <Header>
        <HeaderLeft>
          <IconBox>{icon}</IconBox>
          <div>{subtitle && <Subtitle $accentColor={accentColor}>{subtitle}</Subtitle>}</div>
        </HeaderLeft>
      </Header>

      <Title>{title}</Title>

      <Body>{children}</Body>

      <Slot>{/* slot for list items rendered by caller */}</Slot>

      <Footer>
        <FooterLabel>{footerLabel}</FooterLabel>
        {ctaText && (
          <Cta className="action-cta" $accentColor={accentColor}>
            <CtaText>{ctaText}</CtaText>
            <CtaArrow $accentColor={accentColor}>→</CtaArrow>
          </Cta>
        )}
      </Footer>

      <AccentLine className="accent-line" />
    </Root>
  )
}

export { SelectionCard }
export default React.memo(SelectionCard)
