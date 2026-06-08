import React from 'react'
import styled from 'styled-components'
import { colors, withAlpha } from '../colors'
import { radii } from '../tokens'

/**
 * Tone variants.
 * - `primary` / `secondary` are the original metric-card tones (backward compatible).
 * - `info` / `success` / `warning` / `danger` are tinted note/callout tones.
 */
export type InfoCardTone = 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'danger'

export interface InfoCardProps {
  /** Eyebrow / label text rendered above the value. Optional when using free-form children. */
  title?: string
  /** Primary value/headline. Optional when using free-form children. */
  value?: string
  /** Visual tone. */
  tone?: InfoCardTone
  /** Free-form content. When provided it renders below the title/value (if any). */
  children?: React.ReactNode
  /** Optional leading icon name (material-symbols-outlined). */
  icon?: string
  className?: string
  id?: string
}

/** The two original "metric" tones keep the exact prior look. */
const isMetricTone = (tone: InfoCardTone): tone is 'primary' | 'secondary' =>
  tone === 'primary' || tone === 'secondary'

type TintTone = 'info' | 'success' | 'warning' | 'danger'

const tintColor: Record<TintTone, string> = {
  info: colors.info,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger
}

const accentFor = (tone: InfoCardTone): string => {
  if (tone === 'primary') return colors.primary
  if (tone === 'secondary') return colors.secondary
  return tintColor[tone]
}

const Card = styled.div<{ $tone: InfoCardTone }>`
  border-radius: ${radii.lg - 2}px; /* 10px, matches original */
  transition: background 0.2s;

  /* Metric tones (primary/secondary) preserve the original surface look. */
  background: ${({ $tone }) =>
    $tone === 'primary' || $tone === 'secondary'
      ? colors.surfaceContainerLow
      : withAlpha(accentFor($tone), 0.12)};
  padding: ${({ $tone }) => ($tone === 'primary' || $tone === 'secondary' ? '18px' : '16px')};
  border-bottom: ${({ $tone }) =>
    $tone === 'primary' || $tone === 'secondary'
      ? `1px solid ${colors.outlineVariant}`
      : 'none'};
  border-left: ${({ $tone }) =>
    $tone === 'primary' || $tone === 'secondary'
      ? 'none'
      : `3px solid ${accentFor($tone)}`};
`

const Title = styled.div`
  font-size: 10px;
  text-transform: uppercase;
  color: ${colors.onSurfaceVariant};
  letter-spacing: 1px;
`

const ValueRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 8px;
`

const Value = styled.div`
  font-size: 22px;
  font-weight: 800;
  color: ${colors.onSurface};
`

const Indicator = styled.div<{ $accent: string }>`
  font-size: 12px;
  color: ${({ $accent }) => $accent};
`

/* --- Tinted callout sub-elements --- */

const CalloutHeader = styled.div<{ $accent: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ $accent }) => $accent};
`

const CalloutIcon = styled.span`
  font-size: 18px;
  line-height: 1;
`

const CalloutTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
`

const CalloutValue = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${colors.onSurface};
  margin-top: 4px;
`

const CalloutBody = styled.div`
  font-size: 13px;
  color: ${colors.onSurfaceVariant};
  margin-top: 6px;
  line-height: 1.5;
`

const InfoCard: React.FC<InfoCardProps> = ({
  title,
  value,
  tone = 'primary',
  children,
  icon,
  className,
  id
}) => {
  const accent = accentFor(tone)

  if (isMetricTone(tone)) {
    // Backward-compatible metric layout (unchanged visuals).
    return (
      <Card $tone={tone} className={className} id={id}>
        {title !== undefined && <Title>{title}</Title>}
        <ValueRow>
          <Value>{value}</Value>
          <Indicator $accent={accent}>{tone === 'primary' ? 'STABLE' : '+0.42%'}</Indicator>
        </ValueRow>
        {children}
      </Card>
    )
  }

  // Tinted note/callout layout for info/success/warning/danger.
  return (
    <Card $tone={tone} className={className} id={id} role="note">
      {(title !== undefined || icon !== undefined) && (
        <CalloutHeader $accent={accent}>
          {icon !== undefined && (
            <CalloutIcon className="material-symbols-outlined" aria-hidden="true">
              {icon}
            </CalloutIcon>
          )}
          {title !== undefined && <CalloutTitle>{title}</CalloutTitle>}
        </CalloutHeader>
      )}
      {value !== undefined && <CalloutValue>{value}</CalloutValue>}
      {children !== undefined && children !== null && <CalloutBody>{children}</CalloutBody>}
    </Card>
  )
}

export default React.memo(InfoCard)
export { InfoCard }
