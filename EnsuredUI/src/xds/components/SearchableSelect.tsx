import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  SelectRoot,
  SelectTrigger,
  TriggerLabel,
  Chevron,
  Panel,
  SearchRow,
  SearchInput,
  OptionList,
  OptionButton as OptionRow,
  SelectedCheck as Check,
  OptionMessage,
} from './selectBase'

export type SearchableSelectOption = {
  value: string
  label: string
}

export type SearchableSelectProps = {
  options: SearchableSelectOption[]
  /** The selected option's value (or any raw value — shown as-is if not in options). */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  /** Accessible name for the trigger. */
  ariaLabel?: string
  disabled?: boolean
  noMatchText?: string
  emptyText?: string
  className?: string
}

/**
 * A single-select dropdown with a built-in text filter — the single-select
 * sibling of MultiSelect (used by the marketplace filters). Typing in the
 * search box narrows the option list. Any raw `value` not present in `options`
 * is still shown in the trigger, so legacy / custom values survive.
 */
export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  ariaLabel,
  disabled = false,
  noMatchText = 'No matches.',
  emptyText = 'No options available.',
  className,
}) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const normalizedQuery = query.trim().toLowerCase()
  const visibleOptions = useMemo(() => {
    if (!normalizedQuery) return options
    return options.filter((o) => o.label.toLowerCase().includes(normalizedQuery))
  }, [options, normalizedQuery])

  const selectedLabel = options.find((o) => o.value === value)?.label
  const summary = value ? selectedLabel ?? value : placeholder

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (open) {
      setQuery('')
      const selectedIndex = options.findIndex((o) => o.value === value)
      setActive(selectedIndex >= 0 ? selectedIndex : 0)
      searchRef.current?.focus()
    }
  }, [open, options, value])

  // Keep the active index in range as the filtered list changes.
  useEffect(() => {
    setActive((prev) => Math.min(prev, Math.max(0, visibleOptions.length - 1)))
  }, [visibleOptions.length])

  // Scroll the active row into view.
  useEffect(() => {
    if (!open || !listRef.current) return
    const el = listRef.current.children[active] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const choose = (v: string) => {
    onChange(v)
    setOpen(false)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((p) => Math.min(p + 1, visibleOptions.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((p) => Math.max(p - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const opt = visibleOptions[active]
      if (opt) choose(opt.value)
    }
  }

  return (
    <SelectRoot ref={rootRef} className={className}>
      <SelectTrigger
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setOpen((p) => !p)}
      >
        <TriggerLabel $placeholder={!value}>{summary}</TriggerLabel>
        <Chevron className="material-symbols-outlined" $open={open} aria-hidden="true">
          expand_more
        </Chevron>
      </SelectTrigger>

      {open ? (
        <Panel role="listbox" aria-label={ariaLabel}>
          <SearchRow>
            <span className="material-symbols-outlined" aria-hidden="true">
              search
            </span>
            <SearchInput
              ref={searchRef}
              type="text"
              value={query}
              placeholder={searchPlaceholder}
              aria-label={ariaLabel ? `Search ${ariaLabel}` : 'Search'}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
            />
          </SearchRow>

          <OptionList ref={listRef}>
            {options.length === 0 ? (
              <OptionMessage>{emptyText}</OptionMessage>
            ) : visibleOptions.length === 0 ? (
              <OptionMessage>{noMatchText}</OptionMessage>
            ) : (
              visibleOptions.map((option, index) => (
                <OptionRow
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  $active={index === active}
                  $selected={option.value === value}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(option.value)}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {option.label}
                  </span>
                  {option.value === value ? (
                    <Check className="material-symbols-outlined" aria-hidden="true">
                      check
                    </Check>
                  ) : null}
                </OptionRow>
              ))
            )}
          </OptionList>
        </Panel>
      ) : null}
    </SelectRoot>
  )
}

export default SearchableSelect
