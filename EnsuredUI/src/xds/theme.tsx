import React, { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react'
import { ThemeProvider as StyledThemeProvider } from 'styled-components'

export type XdsThemeName = 'dark' | 'light'

export type XdsThemeColors = {
  background: string
  surface: string
  surfaceVariant: string
  surfaceContainerLow: string
  surfaceContainer: string
  surfaceContainerHigh: string
  surfaceContainerHighest: string
  surfaceDeep: string
  surfaceLow: string
  surfacePanel: string
  surfaceRaised: string
  surfaceHigh: string
  surfaceElevated: string
  primary: string
  primaryHover: string
  primarySoft: string
  primaryContainer: string
  onPrimary: string
  onPrimaryContainer: string
  secondary: string
  secondaryContainer: string
  onSecondaryContainer: string
  accent: string
  accentStrong: string
  success: string
  info: string
  warning: string
  danger: string
  dangerDeep: string
  error: string
  errorContainer: string
  onErrorContainer: string
  errorSoft: string
  dangerBright: string
  onSurface: string
  onSurfaceVariant: string
  onSurfaceStrong: string
  onSurfaceMuted: string
  outline: string
  outlineVariant: string
  border: string
  scrim: string
  tertiaryContainer: string
  textPrimary: string
  textSecondary: string
  textInverse: string
  textAccent: string
  navItemBackground: string
}

export type XdsTheme = {
  name: XdsThemeName
  colors: XdsThemeColors
}

export const darkTheme: XdsTheme = {
  name: 'dark',
  colors: {
    background: '#0f141b',
    surface: '#0f141b',
    surfaceVariant: '#30353d',
    surfaceContainerLow: '#171c23',
    surfaceContainer: '#1b2027',
    surfaceContainerHigh: '#252a32',
    surfaceContainerHighest: '#30353d',
    surfaceDeep: '#090f15',
    surfaceLow: '#171c23',
    surfacePanel: '#1b2027',
    surfaceRaised: '#252a32',
    surfaceHigh: '#30353d',
    surfaceElevated: '#343941',
    primary: '#95d4b3',
    primaryHover: '#235a43',
    primarySoft: '#b1f0ce',
    primaryContainer: '#2d6a4f',
    onPrimary: '#003824',
    onPrimaryContainer: '#a8e7c5',
    secondary: '#e9c349',
    secondaryContainer: '#af8d11',
    onSecondaryContainer: '#342800',
    accent: '#95d4b3',
    accentStrong: '#2d6a4f',
    success: '#95d4b3',
    info: '#bfc9c1',
    warning: '#e9c349',
    danger: '#ffb3ae',
    dangerDeep: '#721121',
    error: '#ffb4ab',
    errorContainer: '#93000a',
    onErrorContainer: '#ffdad6',
    errorSoft: '#ffb4ab',
    dangerBright: '#ffb3ae',
    onSurface: '#dee2ec',
    onSurfaceVariant: '#bfc9c1',
    onSurfaceStrong: '#f0e6d8',
    onSurfaceMuted: '#e2d9cc',
    outline: '#8a938c',
    outlineVariant: '#404943',
    border: '#30363d',
    scrim: '#090f15',
    tertiaryContainer: '#ae3032',
    textPrimary: '#f0e6d8',
    textSecondary: '#bfc9c1',
    textInverse: '#0f141b',
    textAccent: '#e9c349',
    navItemBackground: '#1b2027',
  },
}

export const lightTheme: XdsTheme = {
  name: 'light',
  colors: {
    background: '#fff8f3',
    surface: '#fff8f3',
    surfaceVariant: '#e7e1dc',
    surfaceContainerLow: '#f9f2ed',
    surfaceContainer: '#f3ede7',
    surfaceContainerHigh: '#ede7e2',
    surfaceContainerHighest: '#e7e1dc',
    surfaceDeep: '#ece0d2',
    surfaceLow: '#f9f2ed',
    surfacePanel: '#f6e9dd',
    surfaceRaised: '#fdf6ee',
    surfaceHigh: '#e7e1dc',
    surfaceElevated: '#dfd9d4',
    primary: '#1b4332',
    primaryHover: '#0b3c2a',
    primarySoft: '#3f6653',
    primaryContainer: '#012d1d',
    onPrimary: '#ffffff',
    onPrimaryContainer: '#c1ecd4',
    secondary: '#9e7b34',
    secondaryContainer: '#f7f1e1',
    onSecondaryContainer: '#342300',
    accent: '#a53843',
    accentStrong: '#721121',
    success: '#1b4332',
    info: '#3f6653',
    warning: '#9e7b34',
    danger: '#a53843',
    dangerDeep: '#721121',
    error: '#ba1a1a',
    errorContainer: '#ffdad6',
    onErrorContainer: '#93000a',
    errorSoft: '#a53843',
    dangerBright: '#a53843',
    onSurface: '#1d1b18',
    onSurfaceVariant: '#414844',
    onSurfaceStrong: '#1c1a17',
    onSurfaceMuted: '#595349',
    outline: '#717973',
    outlineVariant: '#c8beb2',
    border: '#c8beb2',
    scrim: '#1c1a17',
    tertiaryContainer: '#f5e6e8',
    textPrimary: '#1c1a17',
    textSecondary: '#595349',
    textInverse: '#ffffff',
    textAccent: '#9e7b34',
    navItemBackground: '#f3ede7',
  },
}

export const xdsThemes: Record<XdsThemeName, XdsTheme> = {
  dark: darkTheme,
  light: lightTheme,
}

export const XDS_THEME_STORAGE_KEY = 'ensured-xds-theme'

type ThemeContextValue = {
  theme: XdsTheme
  themeName: XdsThemeName
  setTheme: (theme: XdsThemeName) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const cssVariables = (theme: XdsTheme): Record<string, string> => {
  const color = theme.colors

  return {
    '--xds-background': color.background,
    '--xds-surface': color.surface,
    '--xds-surface-variant': color.surfaceVariant,
    '--xds-surface-container-low': color.surfaceContainerLow,
    '--xds-surface-container': color.surfaceContainer,
    '--xds-surface-container-high': color.surfaceContainerHigh,
    '--xds-surface-container-highest': color.surfaceContainerHighest,
    '--xds-surface-deep': color.surfaceDeep,
    '--xds-surface-low': color.surfaceLow,
    '--xds-surface-panel': color.surfacePanel,
    '--xds-surface-raised': color.surfaceRaised,
    '--xds-surface-high': color.surfaceHigh,
    '--xds-surface-elevated': color.surfaceElevated,
    '--xds-primary': color.primary,
    '--xds-primary-hover': color.primaryHover,
    '--xds-primary-soft': color.primarySoft,
    '--xds-primary-container': color.primaryContainer,
    '--xds-on-primary': color.onPrimary,
    '--xds-on-primary-container': color.onPrimaryContainer,
    '--xds-secondary': color.secondary,
    '--xds-secondary-container': color.secondaryContainer,
    '--xds-on-secondary-container': color.onSecondaryContainer,
    '--xds-accent': color.accent,
    '--xds-accent-strong': color.accentStrong,
    '--xds-success': color.success,
    '--xds-info': color.info,
    '--xds-warning': color.warning,
    '--xds-danger': color.danger,
    '--xds-danger-deep': color.dangerDeep,
    '--xds-error': color.error,
    '--xds-error-container': color.errorContainer,
    '--xds-on-error-container': color.onErrorContainer,
    '--xds-error-soft': color.errorSoft,
    '--xds-danger-bright': color.dangerBright,
    '--xds-on-surface': color.onSurface,
    '--xds-on-surface-variant': color.onSurfaceVariant,
    '--xds-on-surface-strong': color.onSurfaceStrong,
    '--xds-on-surface-muted': color.onSurfaceMuted,
    '--xds-outline': color.outline,
    '--xds-outline-variant': color.outlineVariant,
    '--xds-border': color.border,
    '--xds-scrim': color.scrim,
    '--xds-tertiary-container': color.tertiaryContainer,
    '--xds-text-primary': color.textPrimary,
    '--xds-text-secondary': color.textSecondary,
    '--xds-text-inverse': color.textInverse,
    '--xds-text-accent': color.textAccent,
    '--background': color.background,
    '--bg': color.background,
    '--surface': color.surface,
    '--surface-variant': color.surfaceVariant,
    '--surface-container-lowest': color.background,
    '--surface-container-low': color.surfaceContainerLow,
    '--surface-container': color.surfaceContainer,
    '--surface-container-high': color.surfaceContainerHigh,
    '--surface-container-highest': color.surfaceContainerHighest,
    '--primary': color.primary,
    '--primary-fixed-dim': color.primarySoft,
    '--primary-container': color.primaryContainer,
    '--on-primary': color.onPrimary,
    '--on-primary-container': color.onPrimaryContainer,
    '--secondary': color.secondary,
    '--secondary-container': color.secondaryContainer,
    '--on-secondary-container': color.onSecondaryContainer,
    '--error': color.error,
    '--error-container': color.errorContainer,
    '--on-error-container': color.onErrorContainer,
    '--on-surface': color.onSurface,
    '--on-surface-variant': color.onSurfaceVariant,
    '--outline': color.outline,
    '--outline-variant': color.outlineVariant,
    '--tertiary': color.accent,
    '--tertiary-container': color.tertiaryContainer,
    '--text': color.textPrimary,
    '--text-primary': color.textPrimary,
    '--text-secondary': color.textSecondary,
    '--text-variant': color.textSecondary,
    '--color-success': color.success,
    '--color-info': color.info,
    '--color-warning': color.warning,
    '--color-danger': color.danger,
    '--nav-item-bg': color.navItemBackground,
  }
}

const initialThemeName = (): XdsThemeName => {
  if (typeof window === 'undefined') return 'dark'
  const stored = window.localStorage.getItem(XDS_THEME_STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'dark'
}

export function XdsThemeProvider({ children }: React.PropsWithChildren) {
  const [themeName, setTheme] = useState<XdsThemeName>(initialThemeName)
  const theme = xdsThemes[themeName]

  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.theme = themeName
    root.style.colorScheme = themeName
    Object.entries(cssVariables(theme)).forEach(([name, value]) => root.style.setProperty(name, value))
    window.localStorage.setItem(XDS_THEME_STORAGE_KEY, themeName)
  }, [theme, themeName])

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    themeName,
    setTheme,
    toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
  }), [theme, themeName])

  return (
    <ThemeContext.Provider value={value}>
      <StyledThemeProvider theme={theme}>{children}</StyledThemeProvider>
    </ThemeContext.Provider>
  )
}

export function useXdsTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useXdsTheme must be used inside XdsThemeProvider')
  return context
}
