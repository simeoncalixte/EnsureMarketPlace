// Generic design tokens: spacing, typography, radii, z-index
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40
} as const

export const radii = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  round: 9999
} as const

export const typography = {
  fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 28,
    '2xl': 36
  },
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  }
} as const

export const zIndices = {
  base: 0,
  dropdown: 100,
  modal: 900,
  toast: 1000
} as const

export type Tokens = typeof spacing & typeof radii & typeof typography & typeof zIndices

export default { spacing, radii, typography, zIndices }
