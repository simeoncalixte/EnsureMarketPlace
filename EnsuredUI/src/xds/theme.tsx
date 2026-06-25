import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type ThemeMode = 'dark' | 'light'

const STORAGE_KEY = 'xds-theme'

type ThemeContextValue = {
  theme: ThemeMode
  setTheme: (mode: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

// Reflect the active theme onto <html data-theme> so the `--xds-*` light
// overrides in colors.ts take effect (dark is the default `:root`, so we only
// set the attribute for light).
const applyTheme = (mode: ThemeMode) => {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (mode === 'light') root.setAttribute('data-theme', 'light')
  else root.removeAttribute('data-theme')
}

// Resolve the initial theme: persisted choice wins, otherwise dark (the app's
// historical default). We intentionally do NOT auto-follow prefers-color-scheme
// so the dark-first design stays the default until the user opts in.
const readInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'dark'
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* localStorage unavailable (private mode / SSR) — fall through */
  }
  return 'dark'
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(readInitialTheme)

  // Apply on mount and whenever the theme changes.
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode)
    try {
      window.localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      /* ignore persistence failures */
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/**
 * Access the active theme and its setters. Falls back to a self-contained local
 * controller when used outside a {@link ThemeProvider} (e.g. an isolated story),
 * so the toggle still works without app-level wiring.
 */
export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext)
  const [localTheme, setLocalTheme] = useState<ThemeMode>(readInitialTheme)

  const localSet = useCallback((mode: ThemeMode) => {
    setLocalTheme(mode)
    applyTheme(mode)
  }, [])

  if (ctx) return ctx
  return {
    theme: localTheme,
    setTheme: localSet,
    toggleTheme: () => localSet(localTheme === 'dark' ? 'light' : 'dark')
  }
}
