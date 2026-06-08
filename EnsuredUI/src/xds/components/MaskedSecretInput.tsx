import React, { useState } from 'react'
import styled from 'styled-components'
import { colors } from '../colors'
import { spacing, typography } from '../tokens'
import Input from './Input'

export type MaskedSecretInputProps = {
  value: string
  onChange: (v: string) => void
  readOnly?: boolean
  placeholder?: string
  id?: string
}

const Wrapper = styled.div`
  position: relative;
  width: 100%;
`

const ToggleButton = styled.button`
  position: absolute;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${spacing.xs}px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: ${colors.text.secondary};
  line-height: 1;
  font-size: ${typography.sizes.lg}px;

  &:hover {
    color: ${colors.text.primary};
  }

  &:focus-visible {
    outline: 1px solid ${colors.primary};
    outline-offset: 2px;
  }
`

const PaddedInput = styled(Input)`
  padding-right: ${spacing.lg}px;
`

export const MaskedSecretInput: React.FC<MaskedSecretInputProps> = ({
  value,
  onChange,
  readOnly,
  placeholder,
  id
}) => {
  const [revealed, setRevealed] = useState(false)

  return (
    <Wrapper>
      <PaddedInput
        id={id}
        type={revealed ? 'text' : 'password'}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
      <ToggleButton
        type="button"
        aria-label={revealed ? 'Hide secret' : 'Show secret'}
        aria-pressed={revealed}
        onClick={() => setRevealed((r) => !r)}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          {revealed ? 'visibility_off' : 'visibility'}
        </span>
      </ToggleButton>
    </Wrapper>
  )
}

export default MaskedSecretInput
