import React, { useId, useState } from 'react'
import styled from 'styled-components'
import { colors } from '../colors'
import { typography } from '../tokens'

// A small "ⓘ" affordance that reveals an explanatory tooltip on hover, focus, or
// click. Visibility is React-state driven (not pure CSS) so the tooltip text is
// actually mounted in the DOM when shown — keyboard-reachable and assertable in
// interaction tests. Place it next to a field label to explain that field's use.

const Wrapper = styled.span`
  position: relative;
  display: inline-flex;
  vertical-align: middle;
`

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  padding: 0;
  border: 1px solid ${colors.outline};
  border-radius: 50%;
  background: transparent;
  color: ${colors.onSurfaceVariant};
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 10px;
  font-style: italic;
  font-weight: 700;
  line-height: 1;
  cursor: help;
  transition: color 0.15s ease, border-color 0.15s ease;

  &:hover,
  &:focus-visible {
    color: ${colors.primary};
    border-color: ${colors.primary};
    outline: none;
  }
`

const Tooltip = styled.span`
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  width: max-content;
  max-width: 260px;
  padding: 8px 10px;
  background: ${colors.surfaceContainerHighest};
  border: 1px solid ${colors.outlineVariant};
  border-radius: 6px;
  color: ${colors.onSurface};
  font-size: ${typography.sizes.xs}px;
  line-height: 1.45;
  letter-spacing: normal;
  text-transform: none;
  font-weight: 400;
  font-family: ${typography.fontFamily ?? 'inherit'};
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  white-space: normal;
`

export type InfoHintProps = {
  /** The explanatory text shown in the tooltip. */
  text: React.ReactNode
  /** Accessible label for the trigger. Defaults to "More information". */
  label?: string
}

export const InfoHint: React.FC<InfoHintProps> = ({ text, label = 'More information' }) => {
  const [open, setOpen] = useState(false)
  const tooltipId = useId()

  return (
    <Wrapper
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <IconButton
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        i
      </IconButton>
      {open && (
        <Tooltip role="tooltip" id={tooltipId}>
          {text}
        </Tooltip>
      )}
    </Wrapper>
  )
}

export default InfoHint
