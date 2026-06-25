// Design color palette tokens for EnsuredUI
//
// Theming model
// -------------
// Every token below is backed by a CSS custom property (`--xds-*`). The exported
// `colors` object holds `var(--xds-*, <dark-fallback>)` strings, so any value
// consumed in a CSS context (styled-components, inline `style`, CSS files) is
// theme-reactive automatically: flipping `data-theme` on <html> reflows the whole
// app. The dark palette is the default (`:root`); the light palette overrides only
// the tokens that differ (`:root[data-theme="light"]`).
//
// Non-CSS consumers (Mapbox `paint` properties, recharts SVG attributes, <canvas>)
// cannot resolve `var()`/`color-mix()`, so they must import `rawColors` instead —
// a same-shaped object whose leaves resolve to a concrete hex at access time.

type Pair = { dark: string; light?: string }

// kebab-case a token key for its CSS variable name. Digits pass through so the
// brand/neutral ramps stay `--xds-brand-50`, `--xds-neutral-900`, etc.
const kebab = (key: string): string =>
  key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

// --- Flat semantic tokens (token key -> dark / optional light hex) ---
const TOKENS: Record<string, Pair> = {
  // Semantic base hues — identical across themes.
  success: { dark: '#16a34a' },
  info: { dark: '#0891b2' },
  warning: { dark: '#f59e0b' },
  danger: { dark: '#dc2626', light: '#dc2626' },

  // Surfaces
  background: { dark: '#071129', light: '#f4f6fb' },
  surface: { dark: '#0b1220', light: '#ffffff' },

  // Primary
  primary: { dark: '#4b8eff', light: '#2563eb' },
  primaryContainer: { dark: '#e6f0ff', light: '#dbeafe' },
  onPrimaryContainer: { dark: '#05204b', light: '#05204b' },
  // Text/icon shown on a solid `primary` fill (e.g. primary buttons).
  onPrimary: { dark: '#002e69', light: '#ffffff' },

  // Secondary
  secondary: { dark: '#7ee787', light: '#15803d' },
  secondaryContainer: { dark: '#08220f', light: '#dcfce7' },
  onSecondaryContainer: { dark: '#05220a', light: '#05220a' },

  // Error
  error: { dark: '#ff6b6b', light: '#dc2626' },
  errorContainer: { dark: '#3a0b0b', light: '#fee2e2' },
  onErrorContainer: { dark: '#fff5f5', light: '#7f1d1d' },

  // Surface containers
  surfaceContainerLow: { dark: '#071423', light: '#f1f5f9' },
  surfaceContainer: { dark: '#0b1220', light: '#ffffff' },
  surfaceContainerHigh: { dark: '#0f1726', light: '#f8fafc' },
  surfaceContainerHighest: { dark: '#12202b', light: '#eef2f7' },

  outlineVariant: { dark: 'rgba(148,163,184,0.2)', light: 'rgba(100,116,139,0.22)' },
  onSurface: { dark: '#e6eef8', light: '#0f172a' },
  onSurfaceVariant: { dark: '#98a6bf', light: '#475569' },
  tertiaryContainer: { dark: '#1f2a37', light: '#e2e8f0' },

  // Pure black/white anchors (for alpha overlays, scrims, shadows)
  black: { dark: '#000000' },
  white: { dark: '#ffffff' },

  // Lighter primary used for text/icon accents on dark surfaces.
  primarySoft: { dark: '#adc6ff', light: '#2563eb' },
  // Teal-green accent ramp, distinct from `secondary`/`success`.
  accent: { dark: '#4edea3', light: '#0d9488' },
  accentStrong: { dark: '#00a572', light: '#047857' },
  // Brighter danger used on dark dashboard surfaces.
  dangerBright: { dark: '#ff5451', light: '#dc2626' },
  // Soft salmon error text shown on dark error containers.
  errorSoft: { dark: '#ffb4ab', light: '#dc2626' },

  // On-surface text ramp
  onSurfaceStrong: { dark: '#dae2fd', light: '#0f172a' },
  onSurfaceMuted: { dark: '#c1c6d7', light: '#334155' },

  // Surface ramp (darkest -> lightest in dark theme; inverted for light)
  scrim: { dark: '#020617' }, // overlay/scrim base — stays dark on both themes
  surfaceDeep: { dark: '#0b1326', light: '#e2e8f0' },
  surfaceLow: { dark: '#0f1724', light: '#eef2f7' },
  surfacePanel: { dark: '#131b2e', light: '#ffffff' },
  surfaceRaised: { dark: '#171f33', light: '#ffffff' },
  surfaceHigh: { dark: '#222a3d', light: '#e2e8f0' },
  surfaceElevated: { dark: '#2d3449', light: '#cbd5e1' },

  // Outlines / borders
  outline: { dark: '#8b90a0', light: '#94a3b8' },
  border: { dark: '#414755', light: '#e2e8f0' }
}

// --- Nested token groups ---
// brand / neutral ramps, the chart series palette, and external vendor brand
// colors are intentionally theme-invariant (defined once, no light override).
const GROUPS: Record<string, Record<string, Pair>> = {
  brand: {
    50: { dark: '#eef2ff' }, 100: { dark: '#e0e7ff' }, 200: { dark: '#c7d2fe' },
    300: { dark: '#a5b4fc' }, 400: { dark: '#818cf8' }, 500: { dark: '#6366f1' },
    600: { dark: '#4f46e5' }, 700: { dark: '#4338ca' }, 800: { dark: '#3730a3' },
    900: { dark: '#312e81' }
  },
  neutral: {
    0: { dark: '#ffffff' }, 50: { dark: '#f8fafc' }, 100: { dark: '#f1f5f9' },
    200: { dark: '#e2e8f0' }, 300: { dark: '#cbd5e1' }, 400: { dark: '#94a3b8' },
    500: { dark: '#64748b' }, 600: { dark: '#475569' }, 700: { dark: '#334155' },
    800: { dark: '#1f2937' }, 900: { dark: '#0f172a' }
  },
  dataViz: {
    blue: { dark: '#4b8eff' }, blueLight: { dark: '#60a5fa' }, blueSky: { dark: '#7dd3fc' },
    indigo: { dark: '#6366f1' }, purple: { dark: '#a78bfa' }, violet: { dark: '#c084fc' },
    green: { dark: '#22c55e' }, emerald: { dark: '#10b981' }, teal: { dark: '#2dd4bf' },
    mint: { dark: '#34d399' }, red: { dark: '#ef4444' }, orange: { dark: '#f97316' },
    amber: { dark: '#fbbf24' }, cyan: { dark: '#0891b2' }, cyanDeep: { dark: '#0b7285' }
  },
  vendor: {
    googleBlue: { dark: '#4285f4' }, googleGreen: { dark: '#34a853' },
    googleYellow: { dark: '#fbbc05' }, googleRed: { dark: '#ea4335' },
    microsoftBlue: { dark: '#00a4ef' }, microsoftAzure: { dark: '#0078d4' },
    microsoftGreen: { dark: '#7fba00' }, microsoftRed: { dark: '#f25022' },
    facebookBlue: { dark: '#1877f2' }, awsOrange: { dark: '#ff9900' },
    awsOrangeDeep: { dark: '#e05a00' }
  },
  text: {
    primary: { dark: '#e6eef8', light: '#0f172a' },
    secondary: { dark: '#98a6bf', light: '#475569' },
    inverse: { dark: '#0b1220', light: '#ffffff' },
    accent: { dark: 'rgba(75,142,255,1)', light: 'rgba(37,99,235,1)' }
  }
}

const flatVar = (key: string) => `--xds-${kebab(key)}`
const groupVar = (group: string, key: string) => `--xds-${kebab(group)}-${kebab(key)}`

// Resolve a `--xds-*` variable to a concrete value, falling back to the dark hex
// when the DOM/computed style is unavailable (SSR, jsdom, pre-paint).
const resolveVar = (varName: string, fallback: string): string => {
  if (typeof document === 'undefined' || !document.documentElement) return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  return v || fallback
}

// Build the `var()`-based `colors` object and the concrete-resolving `rawColors`
// object from the same source, preserving the historical shape exactly.
const buildColors = () => {
  const css: Record<string, string> = {}
  const raw: Record<string, unknown> = {}

  for (const [key, pair] of Object.entries(TOKENS)) {
    css[key] = `var(${flatVar(key)}, ${pair.dark})`
    Object.defineProperty(raw, key, {
      enumerable: true,
      get: () => resolveVar(flatVar(key), pair.dark)
    })
  }

  for (const [group, tokens] of Object.entries(GROUPS)) {
    const cssGroup: Record<string, string> = {}
    const rawGroup: Record<string, unknown> = {}
    for (const [key, pair] of Object.entries(tokens)) {
      cssGroup[key] = `var(${groupVar(group, key)}, ${pair.dark})`
      Object.defineProperty(rawGroup, key, {
        enumerable: true,
        get: () => resolveVar(groupVar(group, key), pair.dark)
      })
    }
    css[group] = cssGroup as never
    raw[group] = rawGroup
  }

  // Non-token escape hatch preserved from the original palette.
  css.ui = { navItemBg: 'var(--nav-item-bg)' } as never
  raw.ui = { navItemBg: 'var(--nav-item-bg)' }

  return { css, raw }
}

const built = buildColors()

/**
 * Theme-reactive palette. Values are `var(--xds-*)` strings — use anywhere a CSS
 * context will resolve them (styled-components, inline `style`, CSS). For Mapbox
 * paint, recharts SVG attributes, or <canvas>, import {@link rawColors} instead.
 */
export const colors = built.css as unknown as ColorsShape

/**
 * Concrete-resolving palette for non-CSS consumers. Each leaf reads the live
 * `--xds-*` value (so it follows the active theme on the next render) and falls
 * back to the dark hex when no DOM is available.
 */
export const rawColors = built.raw as unknown as ColorsShape

// Shape derived from the source maps so the public type matches what 68 callers
// already consume. Every token resolves to a `string`.
type FlatKeys = keyof typeof TOKENS
type GroupShape = { [G in keyof typeof GROUPS]: { [K in keyof (typeof GROUPS)[G]]: string } }
export type ColorsShape = { [K in FlatKeys]: string } & GroupShape & {
  ui: { navItemBg: string }
}
export type Colors = ColorsShape

/**
 * Compose a translucent color from a design-system token plus an alpha. Emits a
 * `color-mix()` so it works whether the input is a `var(--xds-*)` token (the
 * common case) or a raw hex literal — and stays theme-reactive. For a concrete
 * rgba (Mapbox/canvas), pass a `rawColors.*` value to {@link hexToRgba} instead.
 *
 * @example withAlpha(colors.primary, 0.12) // 'color-mix(in srgb, var(--xds-primary, #4b8eff) 12%, transparent)'
 */
export const withAlpha = (color: string, alpha: number): string =>
  `color-mix(in srgb, ${color} ${Math.round(alpha * 1000) / 10}%, transparent)`

/**
 * Concrete hex/rgb -> rgba(). For non-CSS consumers that cannot resolve
 * `color-mix()` (Mapbox paint, <canvas>). Accepts 3- or 6-digit hex (with or
 * without `#`); passes through any non-hex input (e.g. an already-rgba string).
 */
export const hexToRgba = (hex: string, alpha: number): string => {
  const normalized = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(normalized)) return hex
  const full =
    normalized.length === 3
      ? normalized.split('').map((c) => c + c).join('')
      : normalized
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// --- Theme CSS generation + injection -------------------------------------
// Build the `:root` (dark) and `:root[data-theme="light"]` (light) variable
// blocks from the same source, so the palette never drifts from the CSS.
const buildThemeCss = (): string => {
  const darkLines: string[] = []
  const lightLines: string[] = []

  for (const [key, pair] of Object.entries(TOKENS)) {
    darkLines.push(`  ${flatVar(key)}: ${pair.dark};`)
    if (pair.light) lightLines.push(`  ${flatVar(key)}: ${pair.light};`)
  }
  for (const [group, tokens] of Object.entries(GROUPS)) {
    for (const [key, pair] of Object.entries(tokens)) {
      darkLines.push(`  ${groupVar(group, key)}: ${pair.dark};`)
      if (pair.light) lightLines.push(`  ${groupVar(group, key)}: ${pair.light};`)
    }
  }

  return [
    `:root {\n${darkLines.join('\n')}\n}`,
    `:root[data-theme="light"] {\n${lightLines.join('\n')}\n}`
  ].join('\n\n')
}

/** The full `--xds-*` variable definitions for both themes (for SSR/Storybook). */
export const themeCss = buildThemeCss()

// Inject once on the client so tokens resolve before first paint.
if (typeof document !== 'undefined') {
  const STYLE_ID = 'xds-theme-tokens'
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = themeCss
    document.head.appendChild(style)
  }
}

export default colors
