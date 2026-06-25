import React from 'react'
import styled, { css } from 'styled-components'
import { colors } from '../colors'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

/**
 * Base text-input chrome — the single source of the default width and underline
 * styling. Input-element fields extend it with `styled(StyledInput)`; the Textarea
 * (a different element) composes `${baseFieldStyles}` directly so it stays a real
 * `<textarea>` instead of an `as`-retargeted input.
 */
export const baseFieldStyles = css`
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid ${colors.outlineVariant};
  padding: 8px 0;
  color: ${colors.text.primary};
  outline: none;
`

export const StyledInput = styled.input`
  ${baseFieldStyles}
`

export const Input: React.FC<InputProps> = ({ placeholder, ...rest }) => {
  return <StyledInput {...rest} placeholder={placeholder} />
}

export default Input
