import React from 'react'
import styled from 'styled-components'
import { colors, withAlpha } from '../colors'
import { radii } from '../tokens'

export type RangeProps = React.InputHTMLAttributes<HTMLInputElement>

const trackFill = (fill: number) =>
  `linear-gradient(90deg, ${colors.primary} 0%, ${colors.primary} ${fill}%, ${colors.outlineVariant} ${fill}%)`

const StyledRange = styled.input<{ $fill: number }>`
  width: 100%;
  appearance: none;
  height: 8px;
  border-radius: ${radii.md}px;
  background: ${({ $fill }) => trackFill($fill)};
  outline: none;

  &::-webkit-slider-runnable-track {
    height: 8px;
    border-radius: ${radii.md}px;
    background: ${({ $fill }) => trackFill($fill)};
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border-radius: ${radii.round}px;
    background: ${colors.onPrimaryContainer};
    box-shadow: 0 2px 6px ${withAlpha(colors.black, 0.4)};
    margin-top: -5px;
  }

  &::-moz-range-track {
    height: 8px;
    border-radius: ${radii.md}px;
    background: ${({ $fill }) => trackFill($fill)};
  }

  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: ${radii.round}px;
    background: ${colors.onPrimaryContainer};
    box-shadow: 0 2px 6px ${withAlpha(colors.black, 0.4)};
  }
`

const toNumber = (raw: RangeProps['value'] | RangeProps['min'], fallback: number): number => {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw))
  return Number.isFinite(n) ? n : fallback
}

const Range: React.FC<RangeProps> = ({ ...rest }) => {
  const min = toNumber(rest.min, 0)
  const max = toNumber(rest.max, 100)
  const current =
    rest.value !== undefined
      ? toNumber(rest.value, min)
      : toNumber(rest.defaultValue, (min + max) / 2)

  const span = max - min
  const fill = span > 0 ? Math.min(100, Math.max(0, ((current - min) / span) * 100)) : 50

  return <StyledRange type="range" $fill={fill} {...rest} />
}

export default Range
