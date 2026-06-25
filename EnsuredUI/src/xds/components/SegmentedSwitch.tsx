import React from 'react'
import styled from 'styled-components'
import { colors } from '../colors'
import { radii, spacing, typography } from '../tokens'

/**
 * An option for the SegmentedSwitch in object form.
 */
export type SegmentedSwitchOption = { label: string; value: string }

/**
 * Legacy prop shape (kept for backward compatibility):
 *   - options: string[]
 *   - value: index (number)
 *   - onChange: (index: number) => void
 */
type LegacySegmentedSwitchProps = {
  options: string[]
  /** Index of the active option. Defaults to 0. */
  value?: number
  /** Called with the index of the clicked option. */
  onChange?: (index: number) => void
  /** Accessible label for the group. */
  'aria-label'?: string
}

/**
 * Enhanced prop shape:
 *   - options: { label, value }[]
 *   - value: the selected option's string value
 *   - onChange: (value: string) => void
 */
type OptionSegmentedSwitchProps = {
  options: SegmentedSwitchOption[]
  /** The `value` of the active option. */
  value?: string
  /** Called with the `value` of the clicked option. */
  onChange?: (value: string) => void
  /** Accessible label for the group. */
  'aria-label'?: string
}

export type XdsSegmentedSwitchProps =
  | LegacySegmentedSwitchProps
  | OptionSegmentedSwitchProps

// Alias kept for convenience / discoverability.
export type SegmentedSwitchProps = XdsSegmentedSwitchProps

const Root = styled.div`
  display: flex;
  background: ${colors.surfaceContainer};
  border-radius: 10px;
  padding: ${spacing.xs}px;
`

const Segment = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 6px ${spacing.sm}px;
  white-space: nowrap;
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.xs}px;
  font-weight: ${typography.weights.bold};
  border-radius: ${radii.md}px;
  border: none;
  cursor: pointer;
  background: ${({ $active }) =>
    $active ? colors.surfaceContainerHigh : 'transparent'};
  color: ${({ $active }) =>
    $active ? colors.primary : colors.onSurfaceVariant};
`

type NormalizedOption = { key: string; label: string; active: boolean; index: number }

function isOptionObjects(
  options: string[] | SegmentedSwitchOption[]
): options is SegmentedSwitchOption[] {
  return options.length > 0 && typeof options[0] === 'object' && options[0] !== null
}

export const SegmentedSwitch: React.FC<XdsSegmentedSwitchProps> = (props) => {
  const { options, value, onChange } = props
  const ariaLabel = props['aria-label']

  const objectMode = isOptionObjects(options)

  const normalized: NormalizedOption[] = objectMode
    ? (options as SegmentedSwitchOption[]).map((opt, index) => ({
        key: opt.value,
        label: opt.label,
        active: value === undefined ? index === 0 : opt.value === value,
        index
      }))
    : (options as string[]).map((label, index) => ({
        key: `${label}-${index}`,
        label,
        active:
          value === undefined
            ? index === 0
            : index === (value as number),
        index
      }))

  const handleClick = (opt: NormalizedOption) => {
    if (!onChange) return
    if (objectMode) {
      ;(onChange as (value: string) => void)(
        (options as SegmentedSwitchOption[])[opt.index].value
      )
    } else {
      ;(onChange as (index: number) => void)(opt.index)
    }
  }

  return (
    <Root role="group" aria-label={ariaLabel}>
      {normalized.map((opt) => (
        <Segment
          key={opt.key}
          type="button"
          $active={opt.active}
          aria-pressed={opt.active}
          onClick={() => handleClick(opt)}
        >
          {opt.label}
        </Segment>
      ))}
    </Root>
  )
}

export default SegmentedSwitch
