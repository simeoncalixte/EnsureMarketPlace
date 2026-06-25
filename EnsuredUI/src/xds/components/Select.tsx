import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  SelectRoot,
  SelectTrigger,
  TriggerLabel,
  Chevron,
  Panel,
  OptionList,
  OptionButton,
  SelectedCheck,
  OptionMessage,
} from './selectBase'

type ParsedOption = { value: string; label: string; disabled: boolean }

// The component keeps the familiar `<option>`-children API so existing callers
// are untouched; we read those children into a list and render them in the same
// custom dropdown panel the other selects use, instead of the browser's native
// option list.
const parseOptions = (children: React.ReactNode): ParsedOption[] => {
  const out: ParsedOption[] = []
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child) || child.type !== 'option') return
    const props = child.props as React.OptionHTMLAttributes<HTMLOptionElement>
    out.push({
      value: props.value == null ? '' : String(props.value),
      label:
        typeof props.children === 'string'
          ? props.children
          : String(props.children ?? ''),
      disabled: Boolean(props.disabled),
    })
  })
  return out
}

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  children,
  value,
  defaultValue,
  onChange,
  disabled,
  id,
  className,
  style,
  'aria-label': ariaLabel,
}) => {
  const options = useMemo(() => parseOptions(children), [children])

  const isControlled = value !== undefined
  const [internal, setInternal] = useState<string>(
    defaultValue != null ? String(defaultValue) : ''
  )
  const currentValue = isControlled ? (value == null ? '' : String(value)) : internal

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((o) => o.value === currentValue)
  const summary = selectedOption ? selectedOption.label : currentValue
  const isPlaceholder = currentValue === ''

  // Native <select> emits a ChangeEvent; callers read `e.target.value`. Synthesize
  // the same shape so their handlers keep working without a real <select> element.
  const emitChange = (next: string) => {
    if (!isControlled) setInternal(next)
    onChange?.({
      target: { value: next },
      currentTarget: { value: next },
    } as unknown as React.ChangeEvent<HTMLSelectElement>)
  }

  const choose = (option: ParsedOption) => {
    if (option.disabled) return
    emitChange(option.value)
    setOpen(false)
  }

  // Close on outside click / Escape while open.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  // Highlight the selected row when opening.
  useEffect(() => {
    if (!open) return
    const selectedIndex = options.findIndex((o) => o.value === currentValue)
    setActive(selectedIndex >= 0 ? selectedIndex : 0)
  }, [open, options, currentValue])

  // Keep the active row visible.
  useEffect(() => {
    if (!open || !listRef.current) return
    const el = listRef.current.children[active] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const toggleOpen = () => {
    if (disabled) return
    setOpen((prev) => !prev)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        setOpen(true)
      }
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((p) => Math.min(p + 1, options.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((p) => Math.max(p - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const option = options[active]
      if (option) choose(option)
    }
  }

  return (
    <SelectRoot ref={rootRef} className={className} style={style}>
      <SelectTrigger
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={toggleOpen}
        onKeyDown={onKeyDown}
      >
        <TriggerLabel $placeholder={isPlaceholder}>{summary || ' '}</TriggerLabel>
        <Chevron className="material-symbols-outlined" $open={open} aria-hidden="true">
          expand_more
        </Chevron>
      </SelectTrigger>

      {open ? (
        <Panel role="listbox" aria-label={ariaLabel}>
          <OptionList ref={listRef}>
            {options.length === 0 ? (
              <OptionMessage>No options available.</OptionMessage>
            ) : (
              options.map((option, index) => (
                <OptionButton
                  key={`${option.value}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={option.value === currentValue}
                  disabled={option.disabled}
                  $active={index === active}
                  $selected={option.value === currentValue}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(option)}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {option.label}
                  </span>
                  {option.value === currentValue ? (
                    <SelectedCheck className="material-symbols-outlined" aria-hidden="true">
                      check
                    </SelectedCheck>
                  ) : null}
                </OptionButton>
              ))
            )}
          </OptionList>
        </Panel>
      ) : null}
    </SelectRoot>
  )
}

export default Select
