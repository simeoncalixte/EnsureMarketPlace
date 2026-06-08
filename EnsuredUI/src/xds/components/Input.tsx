import React from 'react'
import styled from 'styled-components'
import { colors } from '../colors'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const StyledInput = styled.input`
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid ${colors.outlineVariant};
  padding: 8px 0;
  color: ${colors.text.primary};
  outline: none;
`

export const Input: React.FC<InputProps> = ({ placeholder, ...rest }) => {
  return <StyledInput {...rest} placeholder={placeholder} />
}

export default Input
