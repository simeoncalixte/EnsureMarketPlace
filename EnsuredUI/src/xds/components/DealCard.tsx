import React from 'react'
import styled from 'styled-components'
import { colors } from '../colors'
import { radii } from '../tokens'

const Card = styled.div`
  display: grid;
  grid-template-columns: 1fr 120px 120px 120px 140px;
  gap: 12px;
  align-items: center;
  padding: 12px;
  background: ${colors.surfaceContainer};
  border-radius: ${radii.md}px;
  border: 1px solid ${colors.outlineVariant};
`

const TitleGroup = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`

const IconBox = styled.div`
  width: 48px;
  height: 48px;
  border-radius: ${radii.md}px;
  background: ${colors.surfaceContainerHighest};
  display: flex;
  align-items: center;
  justify-content: center;
`

const IconGlyph = styled.span`
  color: ${colors.secondary};
`

const Title = styled.div`
  font-weight: 700;
  color: ${colors.text.primary};
`

const Subtitle = styled.div`
  font-size: 12px;
  color: ${colors.onSurfaceVariant};
`

const Yield = styled.div`
  color: ${colors.secondary};
  font-family: ui-monospace, Menlo, monospace;
`

const Capacity = styled.div`
  color: ${colors.text.primary};
`

const RiskBars = styled.div`
  display: flex;
  gap: 6px;
`

const RiskBar = styled.div<{ $active: boolean }>`
  height: 8px;
  width: 24px;
  border-radius: 6px;
  background: ${({ $active }) => ($active ? colors.primary : colors.outlineVariant)};
`

const Actions = styled.div`
  text-align: right;
`

const InvestButton = styled.button`
  padding: 6px 10px;
  background: ${colors.surfaceContainerHighest};
  color: ${colors.primary};
  border: none;
  border-radius: 6px;
  font-weight: 700;
  cursor: pointer;
`

export type DealCardProps = {
  title: string
  subtitle?: string
  yieldText?: string
  capacity?: string
  riskLevel?: number
  onInvest?: () => void
}

export const DealCard: React.FC<DealCardProps> = ({
  title,
  subtitle,
  yieldText,
  capacity,
  riskLevel = 2,
  onInvest
}) => {
  const bars = Array.from({ length: 3 }).map((_, i) => ({ active: i < riskLevel }))

  return (
    <Card>
      <TitleGroup>
        <IconBox>
          <IconGlyph aria-hidden>🌩️</IconGlyph>
        </IconBox>
        <div>
          <Title>{title}</Title>
          {subtitle && <Subtitle>{subtitle}</Subtitle>}
        </div>
      </TitleGroup>

      <Yield>{yieldText}</Yield>
      <Capacity>{capacity}</Capacity>
      <div>
        <RiskBars>
          {bars.map((b, i) => (
            <RiskBar key={i} $active={b.active} />
          ))}
        </RiskBars>
      </div>

      <Actions>
        <InvestButton type="button" onClick={onInvest}>
          INVEST NOW
        </InvestButton>
      </Actions>
    </Card>
  )
}

export default DealCard
