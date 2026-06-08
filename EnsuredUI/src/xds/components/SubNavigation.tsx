import React from 'react'
import { colors, withAlpha } from '../colors'
import { spacing, radii } from '../tokens'

export type Tab = { id: string; label: string }

export const SubNavigation: React.FC<{ tabs: Tab[]; activeId?: string; onChange?: (id: string) => void; label?: string | null }> = ({ tabs, activeId, onChange, label = 'Sub-Navigation Tabs' }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
      {label != null && <label style={{ fontSize: 10, fontFamily: 'ui-monospace, Menlo, monospace', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>{label}</label>}

      <div style={{ display: 'flex', gap: 32, borderBottom: `1px solid ${withAlpha(colors.neutral[400], 0.15)}` }}>
        {tabs.map((t) => {
          const active = t.id === activeId
          return (
            <button
              key={t.id}
              onClick={() => onChange?.(t.id)}
              style={{
                padding: '0 0 12px 0',
                fontSize: 14,
                fontWeight: 700,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: active ? colors.text.accent : 'var(--text-secondary)',
                borderBottom: active ? `2px solid ${colors.text.accent}` : '2px solid transparent'
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default SubNavigation
