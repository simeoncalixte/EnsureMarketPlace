// Design color palette tokens for EnsuredUI
export const colors = {
  // Brand
  brand: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81'
  },

  // UI neutrals
  neutral: {
    0: '#ffffff',
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1f2937',
    900: '#0f172a'
  },

  // Semantic
  success: '#16a34a',
  info: '#0891b2',
  warning: '#f59e0b',
  danger: '#dc2626',

  // Surfaces
  background: '#071129',
  surface: '#0b1220',

  // Semantic aliases
  primary: '#4b8eff',
  primaryContainer: '#e6f0ff',
  onPrimaryContainer: '#05204b',

  secondary: '#7ee787',
  secondaryContainer: '#08220f',
  onSecondaryContainer: '#05220a',

  error: '#ff6b6b',
  errorContainer: '#3a0b0b',
  onErrorContainer: '#fff5f5',

  // Surface containers
  surfaceContainerLow: '#071423',
  surfaceContainer: '#0b1220',
  surfaceContainerHigh: '#0f1726',
  surfaceContainerHighest: '#12202b',

  outlineVariant: 'rgba(148,163,184,0.2)',
  onSurface: '#e6eef8',
  onSurfaceVariant: '#98a6bf',
  tertiaryContainer: '#1f2a37',

  // Text
  text: {
    primary: '#e6eef8',
    secondary: '#98a6bf',
    inverse: '#0b1220',
    accent: 'rgba(75,142,255,1)'
  }
  ,
  ui: {
    navItemBg: 'var(--nav-item-bg)'
  }
} as const

export type Colors = typeof colors

export default colors
