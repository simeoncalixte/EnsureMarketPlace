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
  // Dark-navy text/icon shown on a solid `primary` fill (e.g. primary buttons).
  onPrimary: '#002e69',

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

  // Pure black/white anchors (for alpha overlays, scrims, shadows)
  black: '#000000',
  white: '#ffffff',

  // --- Extended brand / accent (promoted from recurring app usage) ---
  // Lighter primary used for text/icon accents on dark surfaces.
  primarySoft: '#adc6ff',
  // Teal-green accent ramp, distinct from `secondary`/`success`.
  accent: '#4edea3',
  accentStrong: '#00a572',
  // Brighter danger used on dark dashboard surfaces (distinct from `danger`/`error`).
  dangerBright: '#ff5451',
  // Soft salmon error text shown on dark error containers.
  errorSoft: '#ffb4ab',

  // --- Extended on-surface text ramp (dark theme) ---
  onSurfaceStrong: '#dae2fd', // brightest body text
  onSurfaceMuted: '#c1c6d7', // muted body text

  // --- Surface ramp (dark dashboard blues, darkest -> lightest) ---
  scrim: '#020617', // near-black overlay/scrim base
  surfaceDeep: '#0b1326',
  surfaceLow: '#0f1724',
  surfacePanel: '#131b2e',
  surfaceRaised: '#171f33',
  surfaceHigh: '#222a3d',
  surfaceElevated: '#2d3449',

  // --- Outlines / borders ---
  outline: '#8b90a0',
  border: '#414755',

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

/**
 * Compose an rgba() string from a design-system hex token plus an alpha.
 * Use this instead of hand-writing rgba() literals so every color still
 * originates from the palette. Accepts 3- or 6-digit hex (with or without `#`).
 *
 * @example withAlpha(colors.primary, 0.12) // 'rgba(75, 142, 255, 0.12)'
 */
export const withAlpha = (hex: string, alpha: number): string => {
  const normalized = hex.replace('#', '')
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
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default colors
