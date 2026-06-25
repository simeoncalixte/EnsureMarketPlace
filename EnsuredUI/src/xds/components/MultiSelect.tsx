import React, { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { colors } from '../colors'
import { radii, spacing, typography } from '../tokens'
import {
  SelectRoot,
  SelectTrigger,
  TriggerLabel,
  Chevron,
  Panel,
  SearchRow,
  SearchInput,
  OptionList,
  OptionMessage,
} from './selectBase'

export type MultiSelectOption = {
  value: string
  label: string
}

export type MultiSelectProps = {
  /** Accessible name for the trigger; also the fallback heading. */
  label: string
  options: MultiSelectOption[]
  /** Currently-selected values. */
  selected: Set<string> | readonly string[]
  /** Toggle a single value on/off. */
  onToggle: (value: string) => void
  /** Optional bulk action — selects every value matching the active search. */
  onSelectAll?: (visibleValues: string[]) => void
  /** Optional bulk action — clears every value matching the active search. */
  onClear?: (visibleValues: string[]) => void
  /** Trigger text shown when nothing is selected. */
  placeholder?: string
  searchPlaceholder?: string
  isLoading?: boolean
  error?: string | null
  /** Shown when there are no options to choose from at all. */
  emptyText?: string
  /** Shown when a search matches nothing. */
  noMatchText?: string
  loadingText?: string
  disabled?: boolean
  className?: string
}

const CountPill = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 ${spacing.xs}px;
  border-radius: ${radii.round}px;
  font-size: ${typography.sizes.xs}px;
  font-weight: ${typography.weights.medium};
  background: ${colors.primary};
  color: ${colors.onPrimary};
`

const OptionRow = styled.label`
  display: flex;
  align-items: center;
  gap: ${spacing.sm}px;
  padding: ${spacing.sm - 2}px ${spacing.sm}px;
  border-radius: ${radii.sm}px;
  cursor: pointer;
  font-size: ${typography.sizes.sm}px;
  color: ${colors.text.primary};

  &:hover {
    background: ${colors.surfaceContainerHighest};
  }
`

const OptionCheck = styled.input`
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  accent-color: ${colors.primary};
`

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${spacing.sm - 2}px ${spacing.md - 4}px;
  border-top: 1px solid ${colors.outlineVariant};
  font-size: ${typography.sizes.xs}px;
  color: ${colors.onSurfaceVariant};
`

const FooterActions = styled.div`
  display: flex;
  gap: ${spacing.sm}px;
`

const FooterButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: inherit;
  font-size: ${typography.sizes.xs}px;
  font-weight: ${typography.weights.medium};
  color: ${colors.primary};

  &:hover {
    text-decoration: underline;
  }
`

const toSet = (selected: Set<string> | readonly string[]): Set<string> =>
  selected instanceof Set ? selected : new Set(selected)

/**
 * A compact, select-style trigger that opens a dropdown with a searchable list
 * of multi-selectable options. Replaces tall always-expanded checkbox lists
 * while keeping the same toggle / select-all / clear contract.
 */
export const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  options,
  selected,
  onToggle,
  onSelectAll,
  onClear,
  placeholder = 'Any',
  searchPlaceholder = 'Search…',
  isLoading = false,
  error = null,
  emptyText = 'No options available.',
  noMatchText = 'No matches.',
  loadingText = 'Loading…',
  disabled = false,
  className,
}) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selectedSet = useMemo(() => toSet(selected), [selected])

  const normalizedQuery = query.trim().toLowerCase()
  const visibleOptions = useMemo(() => {
    if (!normalizedQuery) return options
    return options.filter((option) =>
      option.label.toLowerCase().includes(normalizedQuery)
    )
  }, [options, normalizedQuery])

  const visibleValues = useMemo(
    () => visibleOptions.map((option) => option.value),
    [visibleOptions]
  )

  const selectedCount = selectedSet.size
  const summary =
    selectedCount === 0
      ? placeholder
      : selectedCount === 1
      ? options.find((option) => selectedSet.has(option.value))?.label ??
        '1 selected'
      : `${selectedCount} selected`

  // Close on outside click and on Escape, only while open.
  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // Focus the search field when the panel opens.
  useEffect(() => {
    if (open) searchRef.current?.focus()
  }, [open])

  const toggleOpen = () => {
    if (disabled) return
    setOpen((prev) => !prev)
  }

  const hasOptions = options.length > 0

  return (
    <SelectRoot ref={rootRef} className={className}>
      <SelectTrigger
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        disabled={disabled}
        onClick={toggleOpen}
      >
        <TriggerLabel $placeholder={selectedCount === 0}>{summary}</TriggerLabel>
        {selectedCount > 1 ? <CountPill>{selectedCount}</CountPill> : null}
        <Chevron className="material-symbols-outlined" $open={open} aria-hidden="true">
          expand_more
        </Chevron>
      </SelectTrigger>

      {open ? (
        <Panel role="listbox" aria-label={label}>
          <SearchRow>
            <span className="material-symbols-outlined" aria-hidden="true">
              search
            </span>
            <SearchInput
              ref={searchRef}
              type="text"
              value={query}
              placeholder={searchPlaceholder}
              aria-label={`Search ${label}`}
              onChange={(event) => setQuery(event.target.value)}
            />
          </SearchRow>

          <OptionList>
            {isLoading ? (
              <OptionMessage>{error ?? loadingText}</OptionMessage>
            ) : error ? (
              <OptionMessage>{error}</OptionMessage>
            ) : !hasOptions ? (
              <OptionMessage>{emptyText}</OptionMessage>
            ) : visibleOptions.length === 0 ? (
              <OptionMessage>{noMatchText}</OptionMessage>
            ) : (
              visibleOptions.map((option) => (
                <OptionRow key={option.value}>
                  <OptionCheck
                    type="checkbox"
                    checked={selectedSet.has(option.value)}
                    onChange={() => onToggle(option.value)}
                  />
                  {option.label}
                </OptionRow>
              ))
            )}
          </OptionList>

          {hasOptions && !isLoading && !error && (onSelectAll || onClear) ? (
            <Footer>
              <span>{selectedCount} selected</span>
              <FooterActions>
                {onClear ? (
                  <FooterButton type="button" onClick={() => onClear(visibleValues)}>
                    Clear
                  </FooterButton>
                ) : null}
                {onSelectAll ? (
                  <FooterButton
                    type="button"
                    onClick={() => onSelectAll(visibleValues)}
                  >
                    Select all
                  </FooterButton>
                ) : null}
              </FooterActions>
            </Footer>
          ) : null}
        </Panel>
      ) : null}
    </SelectRoot>
  )
}

export default MultiSelect
