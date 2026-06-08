import React from 'react'
import styled from 'styled-components'
import { colors } from '../colors'
import { spacing, radii, typography } from '../tokens'

export type CollapsibleSectionTone = 'default' | 'primary'

export type CollapsibleSectionProps = {
  title: React.ReactNode
  description?: React.ReactNode
  count?: number
  collapsed: boolean
  onToggle: () => void
  tone?: CollapsibleSectionTone
  children?: React.ReactNode
}

const Container = styled.div`
  border: 1px solid ${colors.outlineVariant};
  border-radius: ${radii.md}px;
  background: ${colors.surfaceContainer};
  overflow: hidden;
`

const Header = styled.button<{ $tone: CollapsibleSectionTone }>`
  display: flex;
  align-items: center;
  gap: ${spacing.sm}px;
  width: 100%;
  padding: ${spacing.md}px;
  border: none;
  cursor: pointer;
  text-align: left;
  font-family: ${typography.fontFamily};
  background: ${({ $tone }) =>
    $tone === 'primary' ? colors.primaryContainer : 'transparent'};
  color: ${({ $tone }) =>
    $tone === 'primary' ? colors.onPrimaryContainer : colors.text.primary};

  &:hover {
    background: ${({ $tone }) =>
      $tone === 'primary' ? colors.primaryContainer : colors.surfaceContainerHigh};
  }

  &:focus-visible {
    outline: 2px solid ${colors.primary};
    outline-offset: -2px;
  }
`

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.xs}px;
  flex: 1;
  min-width: 0;
`

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.sm}px;
`

const Title = styled.span`
  font-size: ${typography.sizes.md}px;
  font-weight: ${typography.weights.semibold};
`

const Description = styled.span`
  font-size: ${typography.sizes.xs}px;
  font-weight: ${typography.weights.regular};
  color: ${colors.text.secondary};
`

const Count = styled.span<{ $tone: CollapsibleSectionTone }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 ${spacing.xs}px;
  border-radius: ${radii.round}px;
  font-size: ${typography.sizes.xs}px;
  font-weight: ${typography.weights.medium};
  background: ${({ $tone }) =>
    $tone === 'primary' ? colors.primary : colors.surfaceContainerHighest};
  color: ${({ $tone }) =>
    $tone === 'primary' ? colors.text.inverse : colors.text.primary};
`

const Chevron = styled.span<{ $collapsed: boolean }>`
  flex-shrink: 0;
  transition: transform 0.2s ease;
  transform: rotate(${({ $collapsed }) => ($collapsed ? '0deg' : '180deg')});
  color: ${colors.text.secondary};
`

const Body = styled.div`
  padding: ${spacing.md}px;
  border-top: 1px solid ${colors.outlineVariant};
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.sm}px;
  color: ${colors.text.primary};
`

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  description,
  count,
  collapsed,
  onToggle,
  tone = 'default',
  children
}) => {
  return (
    <Container>
      <Header type="button" $tone={tone} aria-expanded={!collapsed} onClick={onToggle}>
        <TitleBlock>
          <TitleRow>
            <Title>{title}</Title>
            {count !== undefined && <Count $tone={tone}>{count}</Count>}
          </TitleRow>
          {description !== undefined && <Description>{description}</Description>}
        </TitleBlock>
        <Chevron className="material-symbols-outlined" $collapsed={collapsed} aria-hidden="true">
          {collapsed ? 'expand_more' : 'expand_less'}
        </Chevron>
      </Header>
      {!collapsed && <Body>{children}</Body>}
    </Container>
  )
}

export default CollapsibleSection
