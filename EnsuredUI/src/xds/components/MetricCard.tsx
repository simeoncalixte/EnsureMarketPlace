import React from 'react'
import styled from 'styled-components'
import { colors } from '../colors'
import { radii } from '../tokens'

export type MetricCardTrend = 'up' | 'down' | 'flat'

export type MetricCardTone = 'default' | 'success' | 'warning' | 'danger' | 'info'

export type MetricCardProps = {
  /** Uppercase mono label shown at the top of the tile. */
  label: string
  /** Primary metric value. */
  value: string
  /** Secondary line. Existing callers pass arbitrary strings here. */
  delta?: string
  /** Overrides the value color. Preserved for backward compatibility (alias of accentColor). */
  accent?: string
  /** Preferred name for the value accent color. Falls back to `accent`. */
  accentColor?: string
  /** Optional projected/target value rendered alongside the main value. */
  projectedValue?: string
  /** Trend direction; drives the trend indicator color and arrow icon. */
  trend?: MetricCardTrend
  /** Optional leading icon. A string is rendered as a material-symbols-outlined glyph. */
  icon?: React.ReactNode
  /** Semantic tone affecting the trend/delta coloring. */
  tone?: MetricCardTone
  id?: string
  className?: string
}

const toneColor: Record<MetricCardTone, string> = {
  default: colors.text.secondary,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  info: colors.info
}

const trendColor: Record<MetricCardTrend, string> = {
  up: colors.success,
  down: colors.danger,
  flat: colors.text.secondary
}

const trendGlyph: Record<MetricCardTrend, string> = {
  up: 'trending_up',
  down: 'trending_down',
  flat: 'trending_flat'
}

const Card = styled.div`
  background: ${colors.surfaceContainerLow};
  padding: 20px;
  border-radius: ${radii.md}px;
  transition: background 150ms;
  border: 1px solid ${colors.outlineVariant};
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const Label = styled.div`
  font-size: 11px;
  font-family: ui-monospace, Menlo, monospace;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${colors.onSurfaceVariant};
`

const IconWrap = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${colors.onSurfaceVariant};
  font-size: 16px;
  line-height: 1;

  & .material-symbols-outlined {
    font-size: 16px;
    line-height: 1;
  }
`

const ValueRow = styled.div`
  margin-top: 8px;
  display: flex;
  align-items: baseline;
  gap: 8px;
`

const Value = styled.div<{ $accent: string }>`
  font-size: 28px;
  font-family: ui-monospace, Menlo, monospace;
  font-weight: 700;
  color: ${(p) => p.$accent};
`

const Projected = styled.span`
  font-size: 14px;
  font-family: ui-monospace, Menlo, monospace;
  font-weight: 500;
  color: ${colors.onSurfaceVariant};
`

const DeltaRow = styled.div<{ $color: string }>`
  margin-top: 6px;
  display: flex;
  gap: 6px;
  align-items: center;
  color: ${(p) => p.$color};
  font-size: 13px;
`

const DeltaText = styled.span`
  opacity: 0.9;
`

const TrendIcon = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  color: ${(p) => p.$color};

  & .material-symbols-outlined {
    font-size: 16px;
    line-height: 1;
  }
`

const renderIcon = (icon: React.ReactNode): React.ReactNode => {
  if (typeof icon === 'string') {
    return <span className="material-symbols-outlined">{icon}</span>
  }
  return icon
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  delta,
  accent,
  accentColor,
  projectedValue,
  trend,
  icon,
  tone,
  id,
  className
}) => {
  const resolvedAccent = accentColor ?? accent ?? colors.primary

  // Delta/trend coloring: explicit tone wins, otherwise derive from trend, else default secondary.
  let deltaColor: string = colors.text.secondary
  if (tone) deltaColor = toneColor[tone]
  else if (trend) deltaColor = trendColor[trend]

  return (
    <Card id={id} className={className}>
      <Header>
        {icon != null && <IconWrap>{renderIcon(icon)}</IconWrap>}
        <Label>{label}</Label>
      </Header>
      <ValueRow>
        <Value $accent={resolvedAccent}>{value}</Value>
        {projectedValue != null && <Projected>/ {projectedValue}</Projected>}
      </ValueRow>
      {(delta || trend) && (
        <DeltaRow $color={deltaColor}>
          {trend && (
            <TrendIcon $color={trendColor[trend]} aria-hidden="true">
              <span className="material-symbols-outlined">{trendGlyph[trend]}</span>
            </TrendIcon>
          )}
          {delta && <DeltaText>{delta}</DeltaText>}
        </DeltaRow>
      )}
    </Card>
  )
}

export default MetricCard
