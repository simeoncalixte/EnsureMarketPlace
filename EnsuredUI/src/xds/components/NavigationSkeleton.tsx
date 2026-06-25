import React from 'react'
import styled, { keyframes } from 'styled-components'
import { colors, withAlpha } from '../colors'
import { spacing, radii } from '../tokens'

/**
 * Loading placeholder for the server-authoritative side navigation.
 *
 * While `/api/navigation` resolves, the sidebar previously flashed the
 * least-privileged fallback menu (a single "Marketplace" link) and then snapped
 * to the full role-scoped list — a jarring jump. This renders a calm set of
 * shimmering rows instead, with a single highlight crest that travels down the
 * stack so the gradient appears to pass through each link in turn.
 *
 * The cascade is achieved by giving every row the same sweep animation with an
 * `animation-delay` proportional to its index: the highlight reaches each row a
 * beat after the one above it. Honors `prefers-reduced-motion`.
 */

// One horizontal pass of the highlight across a block. Paired with a 200%
// background-size so the bright band starts off-screen, crosses, and exits.
const sweep = keyframes`
  0% { background-position: 150% 0; }
  100% { background-position: -150% 0; }
`

const SkeletonNav = styled.nav`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: ${spacing.sm}px;
`

const Row = styled.div<{ $index: number }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-left: 2px solid transparent;
  border-radius: ${radii.sm}px;
`

// Shared shimmer surface: a dim base with a brighter primary-tinted crest that
// the `sweep` animation drags across. The per-row delay (set inline) staggers
// the crest so it ripples down the list one link at a time.
const Shimmer = styled.span<{ $w: number | string; $h: number; $round?: boolean }>`
  display: block;
  width: ${({ $w }) => (typeof $w === 'number' ? `${$w}px` : $w)};
  height: ${({ $h }) => $h}px;
  border-radius: ${({ $round, $h }) => ($round ? `${$h / 2}px` : `${radii.sm}px`)};
  background-image: linear-gradient(
    90deg,
    ${withAlpha(colors.onSurfaceMuted, 0.1)} 0%,
    ${withAlpha(colors.onSurfaceMuted, 0.1)} 35%,
    ${withAlpha(colors.primarySoft, 0.28)} 50%,
    ${withAlpha(colors.onSurfaceMuted, 0.1)} 65%,
    ${withAlpha(colors.onSurfaceMuted, 0.1)} 100%
  );
  background-size: 200% 100%;
  background-position: 150% 0;
  animation: ${sweep} 1.6s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background-image: linear-gradient(90deg, ${withAlpha(colors.onSurfaceMuted, 0.12)} 0%, ${withAlpha(colors.onSurfaceMuted, 0.12)} 100%);
  }
`

// Varied label widths so the placeholder reads as a real menu rather than a
// uniform grid. Repeats if more rows are requested than widths defined.
const LABEL_WIDTHS = ['72%', '58%', '80%', '64%', '76%', '52%', '68%']

type NavigationSkeletonProps = {
  /** How many placeholder links to render. Default 7. */
  rows?: number
  /** Per-row stagger for the highlight cascade, in seconds. Default 0.12. */
  staggerSeconds?: number
}

export const NavigationSkeleton: React.FC<NavigationSkeletonProps> = ({ rows = 7, staggerSeconds = 0.12 }) => (
  <SkeletonNav aria-hidden="true" data-testid="navigation-skeleton">
    {Array.from({ length: rows }).map((_, index) => {
      const delay = `${index * staggerSeconds}s`
      return (
        <Row key={index} $index={index}>
          <Shimmer $w={20} $h={20} $round style={{ animationDelay: delay }} />
          <Shimmer $w={LABEL_WIDTHS[index % LABEL_WIDTHS.length]} $h={12} style={{ animationDelay: delay }} />
        </Row>
      )
    })}
  </SkeletonNav>
)

export default NavigationSkeleton
