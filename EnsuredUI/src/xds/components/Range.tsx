import React from 'react'
import styled from 'styled-components'
import { colors } from '../colors'

export type RangeProps = React.InputHTMLAttributes<HTMLInputElement>

const StyledRange = styled.input`
  width: 100%;
  appearance: none;
  height: 8px;
  border-radius: 6px;
  background: linear-gradient(90deg, ${colors.primary} 0%, ${colors.primary} 50%, ${colors.outlineVariant} 50%);
  outline: none;

  &::-webkit-slider-runnable-track {
    height: 8px;
    border-radius: 6px;
    background: linear-gradient(90deg, ${colors.primary} 0%, ${colors.primary} 50%, ${colors.outlineVariant} 50%);
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${colors.onPrimaryContainer || '#05204b'};
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    margin-top: -5px;
  }

  &::-moz-range-track {
    height: 8px;
    border-radius: 6px;
    background: linear-gradient(90deg, ${colors.primary} 0%, ${colors.primary} 50%, ${colors.outlineVariant} 50%);
  }

  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${colors.onPrimaryContainer || '#05204b'};
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
  }
`

const Range: React.FC<RangeProps> = ({ ...rest }) => {
  return <StyledRange type="range" {...rest} />
}

export default Range
