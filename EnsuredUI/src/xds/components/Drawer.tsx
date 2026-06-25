import React from 'react'
import { zIndices } from '../tokens'
import { colors, withAlpha } from '../colors'
import { radii, spacing, typography } from '../tokens'

export type DrawerProps = {
  open: boolean
  title?: string
  subtitle?: string
  onClose?: () => void
  children?: React.ReactNode
  footer?: React.ReactNode
  /** Drawer width (default 420px). */
  width?: string
}

/**
 * Pure, presentational right-side slide-in drawer. A scrim covers the viewport;
 * the panel docks to the right edge full-height. No side effects — escape/scroll
 * handling is the caller's concern. Mirrors {@link Modal} but anchored right, for
 * editing flows that should keep the underlying surface (e.g. a map) in view.
 */
export const Drawer: React.FC<DrawerProps> = ({ open, title, subtitle, onClose, children, footer, width = '420px' }) => {
  if (!open) return null

  const border = withAlpha(colors.neutral[400], 0.2)
  const borderLight = withAlpha(colors.neutral[400], 0.15)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        justifyContent: 'flex-end',
        background: withAlpha(colors.scrim, 0.5),
        zIndex: zIndices.modal,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: `min(${width}, 96vw)`,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: colors.surface,
          color: colors.text.primary,
          borderLeft: `1px solid ${border}`,
          boxShadow: `-24px 0 60px ${withAlpha(colors.scrim, 0.4)}`,
        }}
      >
        <div
          style={{
            padding: spacing.md,
            borderBottom: `1px solid ${borderLight}`,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: spacing.md,
            flexShrink: 0,
          }}
        >
          <div>
            {title != null && (
              <h3
                style={{
                  margin: 0,
                  fontSize: typography.sizes.lg,
                  fontWeight: typography.weights.semibold,
                  color: colors.onSurfaceStrong,
                }}
              >
                {title}
              </h3>
            )}
            {subtitle != null && (
              <div style={{ fontSize: typography.sizes.xs, color: colors.onSurfaceVariant, marginTop: 2 }}>{subtitle}</div>
            )}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: withAlpha(colors.white, 0.7),
              fontSize: typography.sizes.md,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: spacing.md, display: 'flex', flexDirection: 'column', gap: spacing.md, flex: 1, overflowY: 'auto' }}>
          {children}
        </div>

        {footer != null && (
          <div
            style={{
              padding: spacing.md,
              borderTop: `1px solid ${borderLight}`,
              display: 'flex',
              gap: 12,
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default Drawer
