import React from 'react'
import { colors } from '../colors'

export interface SelectionCardProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  accentColor?: string
  active?: boolean
  onClick?: () => void
  children?: React.ReactNode
  footerLabel?: string
  ctaText?: string
}

const SelectionCard: React.FC<SelectionCardProps> = ({ title, subtitle, icon, accentColor, active, onClick, children, footerLabel, ctaText }) => {
  const baseStyle: React.CSSProperties = {
    borderRadius: 16,
    padding: 28,
    background: colors.surfaceContainer,
    boxShadow: '0 8px 30px rgba(2,6,23,0.6)',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 360,
    cursor: 'pointer',
  }

  return (
    <div className={`selection-card ${active ? 'active' : ''}`} style={baseStyle} onClick={onClick}>
      <div className="card-overlay" style={{ borderRadius: 12 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 12, background: colors.surfaceContainerHigh, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
          <div>
            {subtitle && <div style={{ fontSize: 12, textTransform: 'uppercase', color: accentColor || colors.primary, fontFamily: 'JetBrains Mono, monospace' }}>{subtitle}</div>}
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: 26, margin: '8px 0', fontWeight: 800 }}>{title}</h2>

      <div style={{ color: colors.onSurfaceVariant, marginBottom: 18 }}>{children}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
        {/* slot for list items rendered by caller */}
      </div>

      <div style={{ marginTop: 18, borderTop: `1px solid ${colors.outlineVariant}`, paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: colors.onSurfaceVariant, fontStyle: 'italic' }}>{footerLabel}</div>
        {ctaText && (
          <div className="action-cta" style={{ display: 'flex', gap: 8, alignItems: 'center', color: accentColor || colors.primary, fontWeight: 700 }}>
            <span style={{ fontSize: 14 }}>{ctaText}</span>
            <span style={{ color: accentColor || colors.primary }}>→</span>
          </div>
        )}
      </div>

      <div className="accent-line" />
    </div>
  )
}

export default SelectionCard
