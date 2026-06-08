import React from 'react'
import styled from 'styled-components'
import { colors } from '../colors'
import { radii, spacing, typography } from '../tokens'

export type ProgressBarTone = 'primary' | 'tertiary' | 'gain' | 'neutral' | 'danger'
export type ProgressBarSize = 'sm' | 'md'

export type ProgressBarProps = {
  /** Current progress value. Combined with `max` to compute the fill percentage. */
  value: number
  /** Maximum value the bar represents. Defaults to 100 (so `value` is treated as a percentage). */
  max?: number
  /** Visual tone of the fill. Defaults to 'gain' to preserve the original green fill. */
  tone?: ProgressBarTone
  /** Optional text label rendered above the track. */
  label?: React.ReactNode
  /** Track/fill height. Defaults to 'md' (12px) to match the original size. */
  size?: ProgressBarSize
  id?: string
  className?: string
}

const toneFill: Record<ProgressBarTone, string> = {
  primary: colors.primary,
  tertiary: colors.text.accent,
  gain: colors.secondary,
  neutral: colors.onSurfaceVariant,
  danger: colors.error
}

const sizeHeight: Record<ProgressBarSize, number> = {
  sm: 6,
  md: 12
}

const Root = styled.div`
  width: 100%;
`

const Label = styled.div`
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.xs}px;
  font-weight: ${typography.weights.medium};
  color: ${colors.onSurfaceVariant};
  margin-bottom: ${spacing.xs}px;
`

const Track = styled.div<{ $height: number }>`
  width: 100%;
  height: ${(p) => p.$height}px;
  background: ${colors.surfaceContainerHigh};
  border-radius: ${radii.round}px;
  overflow: hidden;
`

const Fill = styled.div<{ $value: number; $tone: ProgressBarTone }>`
  width: ${(p) => p.$value}%;
  height: 100%;
  background: ${(p: { $tone: ProgressBarTone }) => toneFill[p.$tone]};
`

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  tone = 'gain',
  label,
  size = 'md',
  id,
  className
}) => {
  const safeMax = max > 0 ? max : 100
  const pct = Math.max(0, Math.min(100, (value / safeMax) * 100))

  return (
    <Root id={id} className={className}>
      {label != null && <Label>{label}</Label>}
      <Track
        $height={sizeHeight[size]}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <Fill $value={pct} $tone={tone} />
      </Track>
    </Root>
  )
}

export default ProgressBar
