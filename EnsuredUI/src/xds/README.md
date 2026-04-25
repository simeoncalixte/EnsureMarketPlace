# EnsuredUI Design System (`xds`)

This folder contains the core design tokens and CSS variables used across the EnsuredUI project.

Files:

- `colors.ts` — TypeScript exports of the canonical color palette.
- `colors.css` — CSS custom properties (variables) to use in global styles or components.
- `tokens.ts` — Spacing, radii, typography sizes/weights, and z-index tokens.
- `index.ts` — Re-exports for convenient imports.

Usage examples:

JS/TS components:

```ts
import { colors, spacing } from './xds'
console.log(colors.brand[500], spacing.md)
```

CSS usage (import `colors.css` in your global stylesheet or Storybook preview):

```css
@import './xds/colors.css';

body { background: var(--bg); color: var(--text-primary); }
```
