import React from 'react'
import styled from 'styled-components'
import { colors, withAlpha } from '../colors'
import { radii } from '../tokens'
import { useTheme } from '../theme'

export type XdsThemeToggleProps = {
  /** Render only the icon (no label). Useful in dense headers. */
  iconOnly?: boolean
  className?: string
}

const ToggleButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: ${radii.md}px;
  background: ${withAlpha(colors.primary, 0.1)};
  color: ${colors.onSurface};
  border: 1px solid ${withAlpha(colors.outline, 0.4)};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease, color 120ms ease;

  &:hover {
    background: ${withAlpha(colors.primary, 0.18)};
    border-color: ${colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${colors.primary};
    outline-offset: 2px;
  }

  .material-symbols-outlined {
    font-size: 18px;
    line-height: 1;
  }
`

/**
 * Switches the app between the dark and light palettes. Backed by
 * {@link useTheme}; flips `data-theme` on <html> and persists the choice.
 */
export const ThemeToggle: React.FC<XdsThemeToggleProps> = ({ iconOnly = false, className }) => {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const next = isDark ? 'light' : 'dark'

  return (
    <ToggleButton
      type="button"
      className={className}
      onClick={toggleTheme}
      aria-pressed={!isDark}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      <span className="material-symbols-outlined" aria-hidden>
        {isDark ? 'light_mode' : 'dark_mode'}
      </span>
      {!iconOnly && <span>{isDark ? 'Light' : 'Dark'}</span>}
    </ToggleButton>
  )
}

export default ThemeToggle
