import styled, { css } from 'styled-components'
import { colors, withAlpha } from '../colors'
import { radii, spacing, typography, zIndices } from '../tokens'

/**
 * Shared chrome for any select-style trigger. Extracted from MultiSelect so that
 * the custom-dropdown trigger (a `<button>`) and the native `<select>` render the
 * exact same surface, padding, border, and interaction states. Compose it with
 * `${triggerChrome}` inside a styled component.
 */
export const triggerChrome = css`
  display: flex;
  align-items: center;
  gap: ${spacing.sm}px;
  width: 100%;
  padding: ${spacing.sm + 2}px ${spacing.md - 2}px;
  border-radius: ${radii.lg - 2}px;
  background: ${colors.surfaceContainer};
  border: 1px solid ${colors.outlineVariant};
  color: ${colors.text.primary};
  font-family: inherit;
  font-size: ${typography.sizes.sm}px;
  text-align: left;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${colors.surfaceContainerHigh};
  }

  &:focus-visible {
    outline: 2px solid ${colors.primary};
    outline-offset: 1px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`

/** Positioning context for the trigger + floating panel. */
export const SelectRoot = styled.div`
  position: relative;
  width: 100%;
  font-family: ${typography.fontFamily};
`

/** The default custom-dropdown trigger button. */
export const SelectTrigger = styled.button`
  ${triggerChrome}
`

export const TriggerLabel = styled.span<{ $placeholder: boolean }>`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${({ $placeholder }) =>
    $placeholder ? colors.onSurfaceVariant : colors.text.primary};
`

export const Chevron = styled.span<{ $open?: boolean }>`
  flex-shrink: 0;
  color: ${colors.onSurfaceVariant};
  transition: transform 0.2s ease;
  transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
`

export const Panel = styled.div`
  position: absolute;
  top: calc(100% + ${spacing.xs}px);
  left: 0;
  right: 0;
  z-index: ${zIndices.dropdown};
  display: flex;
  flex-direction: column;
  max-height: 320px;
  border-radius: ${radii.md}px;
  border: 1px solid ${colors.outlineVariant};
  background: ${colors.surfaceContainerHigh};
  box-shadow: 0 12px 32px ${withAlpha(colors.black, 0.35)};
  overflow: hidden;
`

export const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.sm}px;
  padding: ${spacing.sm}px ${spacing.md - 4}px;
  border-bottom: 1px solid ${colors.outlineVariant};
  color: ${colors.onSurfaceVariant};
`

export const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: ${colors.text.primary};
  font-family: inherit;
  font-size: ${typography.sizes.sm}px;

  &::placeholder {
    color: ${colors.onSurfaceVariant};
  }
`

export const OptionList = styled.div`
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: ${spacing.xs}px;
`

/** A single-select option row (shared by Select and SearchableSelect). */
export const OptionButton = styled.button<{ $active: boolean; $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: ${spacing.sm}px;
  width: 100%;
  text-align: left;
  border: none;
  cursor: pointer;
  padding: ${spacing.sm - 2}px ${spacing.sm}px;
  border-radius: ${radii.sm}px;
  font-family: inherit;
  font-size: ${typography.sizes.sm}px;
  color: ${colors.text.primary};
  background: ${({ $active }) => ($active ? colors.surfaceContainerHighest : 'transparent')};
  font-weight: ${({ $selected }) =>
    $selected ? typography.weights.medium : typography.weights.regular};

  &:hover:not(:disabled) {
    background: ${colors.surfaceContainerHighest};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`

/** The trailing check shown on the selected single-select row. */
export const SelectedCheck = styled.span`
  margin-left: auto;
  color: ${colors.primary};
  flex-shrink: 0;
`

export const OptionMessage = styled.span`
  padding: ${spacing.sm}px ${spacing.md - 4}px;
  font-size: ${typography.sizes.sm}px;
  color: ${colors.onSurfaceVariant};
`
