import React from 'react'
import styled from 'styled-components'
import { spacing } from '../tokens'
import { StyledInput } from './Input'

export type NumberInputProps = React.InputHTMLAttributes<HTMLInputElement>

// Inherits width and base chrome from StyledInput; only the numeric-specific
// padding, monospace face, and box-sizing differ.
const StyledNumber = styled(StyledInput)`
  padding: ${spacing.sm}px 6px;
  font-family: 'JetBrains Mono', monospace;
  box-sizing: border-box;
`

const NumberInput: React.FC<NumberInputProps> = ({ ...rest }) => {
  return <StyledNumber type="number" {...rest} />
}

export default NumberInput
