import React from 'react'
import styled from 'styled-components'
import { colors } from '../colors'
import { spacing, typography } from '../tokens'
import ValidationMessage from './ValidationMessage'

// Local field-specific shades kept to preserve the exact existing visuals.
const FIELD_MUTED = colors.outline
const FIELD_BORDER = colors.border
const FIELD_BORDER_ERROR = colors.dangerBright
const FIELD_TEXT = colors.onSurfaceStrong

const FieldWrapper = styled.div`
  display: grid;
  gap: 6px;
`

const LabelRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const FieldLabel = styled.label`
  display: block;
  font-size: ${typography.sizes.xs}px;
  color: ${FIELD_MUTED};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-family: 'JetBrains Mono', monospace;
`

const FieldInput = styled.input<{ $hasError?: boolean }>`
  background: transparent;
  border: 0;
  border-bottom: 1px solid ${(p) => (p.$hasError ? FIELD_BORDER_ERROR : FIELD_BORDER)};
  padding: ${spacing.sm}px 6px;
  color: ${FIELD_TEXT};
  outline: none;
  font-size: ${typography.sizes.sm}px;

  &:focus {
    border-bottom-color: ${colors.primary};
  }

  &::placeholder {
    color: ${FIELD_MUTED};
  }
`

export type FormFieldProps = {
  label?: string
  error?: string
  /** Optional trailing slot beside the label — e.g. an <InfoHint /> icon. */
  hint?: React.ReactNode
} & React.InputHTMLAttributes<HTMLInputElement>

export const FormField: React.FC<FormFieldProps> = ({ label, error, hint, id, ...rest }) => {
  const fallbackId = React.useId()
  const fieldId = id || fallbackId
  const errorId = `${fieldId}-error`

  return (
    <FieldWrapper>
      {(label || hint) && (
        <LabelRow>
          {label && <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>}
          {hint}
        </LabelRow>
      )}
      <FieldInput
        id={fieldId}
        $hasError={!!error}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      />
      {error && <ValidationMessage id={errorId}>{error}</ValidationMessage>}
    </FieldWrapper>
  )
}

export default FormField
