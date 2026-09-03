import React from 'react'
import styled from 'styled-components'
import { colors, withAlpha } from '../colors'
import { spacing, radii, typography } from '../tokens'

const TRACK_WIDTH = 44
const TRACK_HEIGHT = 24
const KNOB_SIZE = 18
const KNOB_INSET = (TRACK_HEIGHT - KNOB_SIZE) / 2
const KNOB_TRAVEL = TRACK_WIDTH - KNOB_SIZE - KNOB_INSET * 2

const Wrapper = styled.span<{ $disabled: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${spacing.sm}px;
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.sm}px;
  color: ${colors.text.primary};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  user-select: none;
`

const Track = styled.button<{ $checked: boolean }>`
  position: relative;
  flex: 0 0 auto;
  width: ${TRACK_WIDTH}px;
  height: ${TRACK_HEIGHT}px;
  padding: 0;
  border: none;
  border-radius: ${radii.round}px;
  background: ${({ $checked }) => ($checked ? colors.primary : colors.surfaceElevated)};
  transition: background 0.2s ease;
  cursor: inherit;
  outline-offset: 2px;

  &:focus-visible {
    outline: 2px solid ${colors.primary};
  }

  &:disabled {
    cursor: not-allowed;
  }
`

const Knob = styled.span<{ $checked: boolean }>`
  position: absolute;
  top: ${KNOB_INSET}px;
  left: ${KNOB_INSET}px;
  width: ${KNOB_SIZE}px;
  height: ${KNOB_SIZE}px;
  border-radius: ${radii.round}px;
  background: ${colors.neutral[0]};
  box-shadow: 0 1px 2px ${withAlpha(colors.black, 0.25)};
  transform: translateX(${({ $checked }) => ($checked ? KNOB_TRAVEL : 0)}px);
  transition: transform 0.2s ease;
`

const LabelText = styled.span`
  line-height: 1;
`

export type ToggleSwitchProps = {
  checked: boolean
  onChange: (v: boolean) => void
  label?: React.ReactNode
  disabled?: boolean
  id?: string
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  id
}) => {
  const labelId = id ? `${id}-label` : undefined

  const handleClick = () => {
    if (disabled) return
    onChange(!checked)
  }

  return (
    <Wrapper $disabled={disabled}>
      <Track
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-labelledby={label != null ? labelId : undefined}
        disabled={disabled}
        $checked={checked}
        onClick={handleClick}
      >
        <Knob $checked={checked} aria-hidden="true" />
      </Track>
      {label != null && <LabelText id={labelId}>{label}</LabelText>}
    </Wrapper>
  )
}

export default ToggleSwitch
