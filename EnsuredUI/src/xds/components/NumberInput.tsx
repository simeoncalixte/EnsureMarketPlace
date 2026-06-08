import React from 'react'
import styled from 'styled-components'
import { colors } from '../colors'
import { spacing } from '../tokens'

export type NumberInputProps = React.InputHTMLAttributes<HTMLInputElement>

const StyledNumber = styled.input`
  width: 120px;
  background: transparent;
  border: none;
  border-bottom: 1px solid ${colors.outlineVariant};
  padding: ${spacing.sm}px 6px;
  color: ${colors.text.primary};
  font-family: 'JetBrains Mono', monospace;
  outline: none;
  box-sizing: border-box;
`

const NumberInput: React.FC<NumberInputProps> = ({ ...rest }) => {
  return <StyledNumber type="number" {...rest} />
}

export default NumberInput
