import React from 'react'
import type { Meta } from '@storybook/react'
import { colors } from './colors'

const meta: Meta = {
  title: 'XDS/Design Tokens/Colors'
}

export default meta

const Swatch: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
    <div style={{ width: 96, height: 32, background: value, borderRadius: 6, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)' }} />
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text-primary)' }}>
      <div style={{ fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{value}</div>
    </div>
  </div>
)

export const Colors = () => {
  return (
    <div style={{ padding: 20, background: 'var(--bg)', minHeight: '100vh' }}>
      <h2 style={{ color: 'var(--text-primary)' }}>Brand</h2>
      <div>
        {Object.entries(colors.brand).map(([k, v]) => (
          <Swatch key={`brand-${k}`} label={`brand.${k}`} value={v} />
        ))}
      </div>

      <h2 style={{ color: 'var(--text-primary)', marginTop: 20 }}>Neutral</h2>
      <div>
        {Object.entries(colors.neutral).map(([k, v]) => (
          <Swatch key={`neutral-${k}`} label={`neutral.${k}`} value={v} />
        ))}
      </div>

      <h2 style={{ color: 'var(--text-primary)', marginTop: 20 }}>Semantic</h2>
      <div>
        <Swatch label="success" value={colors.success} />
        <Swatch label="info" value={colors.info} />
        <Swatch label="warning" value={colors.warning} />
        <Swatch label="danger" value={colors.danger} />
      </div>
    </div>
  )
}
