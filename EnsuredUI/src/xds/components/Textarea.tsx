import React from 'react'
import styled from 'styled-components'
import { colors } from '../colors'
import { spacing, radii, typography } from '../tokens'

export type XdsTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const StyledTextarea = styled.textarea`
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid ${colors.outlineVariant};
  padding: ${spacing.sm}px 0;
  color: ${colors.text.primary};
  outline: none;
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
