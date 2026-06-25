import React from 'react'

/**
 * Decorative SVG backgrounds for the "How it works" BentoSteps.
 * Each uses `currentColor` so it inherits the step's accent, and is purely
 * decorative (no semantic content) — meant to sit behind the step text and
 * visually echo what that step describes.
 */

const svgProps = {
  viewBox: '0 0 120 120',
  width: '100%',
  height: '100%',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
} as const

/**
 * Step 1 — "Submit anything": email/SFTP/queue/upload converging into one
 * clean structured submission. Stacked document pages with text lines and an
 * upload arrow flowing in.
 */
export const SubmitDecoration: React.FC = () => (
  <svg {...svgProps} aria-hidden>
    {/* back page */}
    <rect x="44" y="20" width="46" height="60" rx="5" stroke="currentColor" strokeWidth="2" />
    {/* front page */}
    <rect x="32" y="32" width="46" height="60" rx="5" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="2" />
    {/* extracted text lines on the front page */}
    <line x1="40" y1="46" x2="70" y2="46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="40" y1="56" x2="70" y2="56" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="40" y1="66" x2="60" y2="66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    {/* upload arrow flowing in */}
    <path d="M22 96 L22 70" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M15 78 L22 70 L29 78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/**
 * Step 2 — "Underwrite with context": classification, validation and geocoded
 * exposure. A map grid with location pins/nodes connected, plus a validation
 * checkmark.
 */
export const UnderwriteDecoration: React.FC = () => (
  <svg {...svgProps} aria-hidden>
    {/* map grid */}
    <rect x="20" y="20" width="80" height="80" rx="6" stroke="currentColor" strokeWidth="2" />
    <line x1="46" y1="20" x2="46" y2="100" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" />
    <line x1="73" y1="20" x2="73" y2="100" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" />
    <line x1="20" y1="46" x2="100" y2="46" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" />
    <line x1="20" y1="73" x2="100" y2="73" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" />
    {/* connections between geocoded nodes */}
    <path d="M36 38 L64 60 L84 34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    {/* exposure nodes */}
    <circle cx="36" cy="38" r="4" fill="currentColor" />
    <circle cx="64" cy="60" r="4" fill="currentColor" />
    <circle cx="84" cy="34" r="4" fill="currentColor" />
    {/* validation check */}
    <path d="M40 82 L48 90 L62 74" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/**
 * Step 3 — "Price and place": risk models and rating produce transparent
 * pricing, and matched capital settles. A rising chart line over bars.
 */
export const PriceDecoration: React.FC = () => (
  <svg {...svgProps} aria-hidden>
    {/* axes */}
    <path d="M24 24 L24 96 L100 96" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    {/* rating bars */}
    <rect x="36" y="72" width="10" height="20" rx="2" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="2" />
    <rect x="56" y="58" width="10" height="34" rx="2" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="2" />
    <rect x="76" y="44" width="10" height="48" rx="2" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="2" />
    {/* pricing trend line */}
    <path d="M32 80 L52 64 L72 52 L94 34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="94" cy="34" r="4" fill="currentColor" />
  </svg>
)
