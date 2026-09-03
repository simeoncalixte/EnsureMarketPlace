// Design color palette tokens for EnsuredUI. Semantic aliases resolve through
// XDS theme variables; raw brand, neutral, data-viz, and vendor palettes stay
// fixed so they can also be used by canvas/map renderers that do not resolve CSS.
const themed = (name: string, fallback: string): string => `var(--xds-${name}, ${fallback})`

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
  success: themed('success', '#95d4b3'),
  info: themed('info', '#bfc9c1'),
  warning: themed('warning', '#e9c349'),
  danger: themed('danger', '#ffb3ae'),

  // Surfaces
  background: themed('background', '#0f141b'),
  surface: themed('surface', '#0f141b'),

  // Semantic aliases
  primary: themed('primary', '#95d4b3'),
  primaryHover: themed('primary-hover', '#235a43'),
  primaryContainer: themed('primary-container', '#2d6a4f'),
  onPrimaryContainer: themed('on-primary-container', '#a8e7c5'),
  // Dark-navy text/icon shown on a solid `primary` fill (e.g. primary buttons).
  onPrimary: themed('on-primary', '#003824'),

  secondary: themed('secondary', '#e9c349'),
  secondaryContainer: themed('secondary-container', '#af8d11'),
  onSecondaryContainer: themed('on-secondary-container', '#342800'),

  error: themed('error', '#ffb4ab'),
  errorContainer: themed('error-container', '#93000a'),
  onErrorContainer: themed('on-error-container', '#ffdad6'),

  // Surface containers
  surfaceContainerLow: themed('surface-container-low', '#171c23'),
  surfaceContainer: themed('surface-container', '#1b2027'),
  surfaceContainerHigh: themed('surface-container-high', '#252a32'),
  surfaceContainerHighest: themed('surface-container-highest', '#30353d'),

  outlineVariant: themed('outline-variant', '#404943'),
  onSurface: themed('on-surface', '#dee2ec'),
  onSurfaceVariant: themed('on-surface-variant', '#bfc9c1'),
  tertiaryContainer: themed('tertiary-container', '#ae3032'),

  // Pure black/white anchors (for alpha overlays, scrims, shadows)
  black: '#000000',
  white: '#ffffff',

  // --- Extended brand / accent (promoted from recurring app usage) ---
  // Lighter primary used for text/icon accents on dark surfaces.
  primarySoft: themed('primary-soft', '#b1f0ce'),
  // Teal-green accent ramp, distinct from `secondary`/`success`.
  accent: themed('accent', '#95d4b3'),
  accentStrong: themed('accent-strong', '#2d6a4f'),
  // Brighter danger used on dark dashboard surfaces (distinct from `danger`/`error`).
  dangerBright: themed('danger-bright', '#ffb3ae'),
  dangerDeep: themed('danger-deep', '#721121'),
  // Soft salmon error text shown on dark error containers.
  errorSoft: themed('error-soft', '#ffb4ab'),

  // --- Extended on-surface text ramp (dark theme) ---
  onSurfaceStrong: themed('on-surface-strong', '#f0e6d8'), // brightest body text
  onSurfaceMuted: themed('on-surface-muted', '#e2d9cc'), // muted body text

  // --- Surface ramp (dark dashboard blues, darkest -> lightest) ---
  scrim: themed('scrim', '#090f15'), // overlay/scrim base
  surfaceDeep: themed('surface-deep', '#090f15'),
  surfaceLow: themed('surface-low', '#171c23'),
  surfacePanel: themed('surface-panel', '#1b2027'),
  surfaceRaised: themed('surface-raised', '#252a32'),
  surfaceHigh: themed('surface-high', '#30353d'),
  surfaceElevated: themed('surface-elevated', '#343941'),

  // --- Outlines / borders ---
  outline: themed('outline', '#8a938c'),
  border: themed('border', '#30363d'),

  // --- Categorical data-visualization palette (chart series) ---
  dataViz: {
    blue: '#4b8eff',
    blueLight: '#60a5fa',
    blueSky: '#7dd3fc',
    indigo: '#6366f1',
    purple: '#a78bfa',
    violet: '#c084fc',
    green: '#22c55e',
    emerald: '#10b981',
    teal: '#2dd4bf',
    mint: '#34d399',
    red: '#ef4444',
    orange: '#f97316',
    amber: '#fbbf24',
    cyan: '#0891b2',
    cyanDeep: '#0b7285'
  },

  // --- Third-party vendor / provider brand identity colors ---
  // These are external brand colors (e.g. "Sign in with Google" affordances)
  // and are intentionally NOT semantic theme tokens; centralized here so they
  // are still sourced from the design system rather than scattered as literals.
  vendor: {
    googleBlue: '#4285f4',
    googleGreen: '#34a853',
    googleYellow: '#fbbc05',
    googleRed: '#ea4335',
    microsoftBlue: '#00a4ef',
    microsoftAzure: '#0078d4',
    microsoftGreen: '#7fba00',
    microsoftRed: '#f25022',
    facebookBlue: '#1877f2',
    awsOrange: '#ff9900',
    awsOrangeDeep: '#e05a00'
  },

  // Text
  text: {
    primary: themed('text-primary', '#f0e6d8'),
    secondary: themed('text-secondary', '#bfc9c1'),
    inverse: themed('text-inverse', '#0f141b'),
    accent: themed('text-accent', '#e9c349')
  }
  ,
  ui: {
    navItemBg: 'var(--nav-item-bg)'
  }
} as const

export type Colors = typeof colors

/**
 * Compose an rgba() string from a design-system hex token plus an alpha.
 * Use this instead of hand-writing rgba() literals so every color still
 * originates from the palette. Accepts 3- or 6-digit hex (with or without `#`).
 *
 * @example withAlpha(colors.primary, 0.12) // 'rgba(75, 142, 255, 0.12)'
 */
export const withAlpha = (color: string, alpha: number): string => {
  const normalizedAlpha = Math.min(1, Math.max(0, alpha))

  // Theme tokens are CSS variables. color-mix preserves their runtime nature,
  // allowing one styled-component definition to respond to theme changes.
  if (!color.startsWith('#')) {
    return `color-mix(in srgb, ${color} ${normalizedAlpha * 100}%, transparent)`
  }

  const normalized = color.replace('#', '')
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${normalizedAlpha})`
}

export default colors
