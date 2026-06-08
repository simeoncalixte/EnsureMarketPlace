import styled from 'styled-components'
import { typography } from '../tokens'
import { colors } from '../colors'

/**
 * XDS Typography primitives.
 *
 * Each export is a styled-component that renders a specific semantic HTML tag so
 * callers get correct document structure (h1 / p / h4 / ul / li) for free. The
 * public API is the set of named exports below; visuals are intentionally kept
 * pixel-identical to the original implementation. Brand-specific text colors are
 * literal values that have no exact match in the shared palette, while font
 * sizes / weights / family are sourced from the design tokens.
 */

// Page-level heading (renders <h1>).
export const PageTitle = styled.h1`
  font-family: Manrope, sans-serif;
  font-weight: ${typography.weights.bold + 100};
  font-size: ${typography.sizes['2xl'] - 4}px;
  color: ${colors.onSurfaceStrong};
  margin: 0 0 ${8}px 0;
`

// Supporting copy that sits beneath a PageTitle (renders <p>).
export const PageSubtitle = styled.p`
  color: ${colors.onSurfaceMuted};
  max-width: 720px;
  margin: 0 0 24px 0;
  font-size: ${typography.sizes.sm}px;
`

// De-emphasised helper / caption text (renders <p>).
export const SmallText = styled.p`
  color: ${colors.onSurfaceMuted};
  font-size: ${typography.sizes.xs}px;
  margin: 0;
`

// Uppercase mono eyebrow used to label sub-sections (renders <h4>).
export const SectionSmallTitle = styled.h4`
  margin: 14px 0 8px;
  font-size: ${typography.sizes.xs}px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${colors.outline};
  font-family: 'JetBrains Mono', monospace;
`

// Bulleted list container (renders <ul>).
export const BulletList = styled.ul`
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 18px;
`

// Single bullet entry, intended as a child of BulletList (renders <li>).
export const ListItem = styled.li`
  color: ${colors.onSurfaceStrong};
  font-size: ${typography.sizes.sm}px;
`

// Inline error message (renders <div>).
export const ErrorText = styled.div`
  margin-top: 12px;
  color: ${colors.dangerBright};
  font-size: ${typography.sizes.xs}px;
`
