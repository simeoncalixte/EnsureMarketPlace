import React from 'react'
import styled from 'styled-components'
import { colors } from '../colors'
import { spacing, radii, typography } from '../tokens'
import { baseFieldStyles } from './Input'

export type XdsTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

// A real <textarea> that inherits the shared width + base chrome via baseFieldStyles,
// then adds the multi-line typography, resize, and state styling.
const StyledTextarea = styled.textarea`
  ${baseFieldStyles}
  padding: ${spacing.sm}px 0;
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.md}px;
  line-height: 1.5;
  resize: vertical;
  border-radius: ${radii.none}px;

  &::placeholder {
    color: ${colors.text.secondary};
  }

  &:focus {
    border-bottom-color: ${colors.primary};
  }

  &:disabled {
    color: ${colors.text.secondary};
    cursor: not-allowed;
    opacity: 0.6;
  }
`

export const Textarea: React.FC<XdsTextareaProps> = ({ rows = 4, ...rest }) => {
  return <StyledTextarea rows={rows} {...rest} />
}

export default Textarea
