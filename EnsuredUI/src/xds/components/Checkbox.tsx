import React from 'react'
import styled from 'styled-components'
import { colors, withAlpha } from '../colors'
import { radii, spacing } from '../tokens'

export type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: React.ReactNode
}

const Label = styled.label`
  display: inline-flex;
  align-items: center;
  gap: ${spacing.sm}px;
`

const Input = styled.input`
  width: 18px;
  height: 18px;
  border-radius: ${radii.sm}px;
  accent-color: ${colors.primary};
  appearance: none;
  background: transparent;
  border: 1px solid ${withAlpha(colors.onSurface, 0.06)};
  display: inline-block;

  &:checked {
    background: ${colors.primary};
    border-color: ${colors.primary};
  }
`

const LabelText = styled.span`
  color: ${colors.onSurfaceVariant};
  font-size: 13px;
`

const Checkbox: React.FC<CheckboxProps> = ({ label, className, ...rest }) => {
  if (label) {
    return (
      <Label className={className}>
        <Input type="checkbox" {...rest} />
        <LabelText>{label}</LabelText>
      </Label>
    )
  }

  return <Input type="checkbox" {...rest} />
}

export default Checkbox
