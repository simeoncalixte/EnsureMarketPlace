import React from 'react'
import { zIndices } from '../../xds/tokens'
import { colors } from '../../xds/colors'
import { radii, spacing } from '../../xds/tokens'
import { Button } from './Button'

export type ModalProps = {
  open: boolean
  title?: string
  onClose?: () => void
  children?: React.ReactNode
  footer?: React.ReactNode
}

// Pure, presentational modal — no side effects (escape handling should be implemented by caller)
export const Modal: React.FC<ModalProps> = ({ open, title, onClose, children, footer }) => {
  if (!open) return null

  const outlineColor = 'rgba(148,163,184,0.2)'
  const outlineColorLight = 'rgba(148,163,184,0.15)'

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(2,6,23,0.6)',
        zIndex: zIndices.modal
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(640px, 94%)',
          background: colors.surface,
          color: colors.text.primary,
          borderRadius: radii.lg,
          border: `1px solid ${outlineColor}`,
          boxShadow: '0 40px 40px rgba(173,198,255,0.12)'
        }}
      >
        <div style={{ padding: spacing.lg - 8, borderBottom: `1px solid ${outlineColorLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: colors.text.primary }}>{title}</h3>
          <button aria-label="Close" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        <div style={{ padding: spacing.xl - 8, display: 'block', gap: spacing.md }}>
          <div style={{ marginBottom: spacing.md }}>{children}</div>
        </div>

        <div style={{ padding: spacing.md, background: 'rgba(11,18,32,0.5)', display: 'flex', gap: 12 }}>
          {footer ? (
            footer
          ) : (
            <>
              <button style={{ flex: 1, padding: '12px 16px', background: 'transparent', border: 'none', color: colors.text.secondary, fontWeight: 600, cursor: 'pointer' }} onClick={onClose}>
                Cancel
              </button>
              <button style={{ flex: 1, padding: '12px 16px', background: colors.brand[500], border: 'none', color: '#fff', borderRadius: radii.sm, fontWeight: 700, cursor: 'pointer' }}>
                Confirm Transaction
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Modal
