import React from 'react'
import type { Meta } from '@storybook/react'
import tokens, { spacing, radii, typography, zIndices } from './tokens'

const meta: Meta = {
  title: 'XDS/Design Tokens/Tokens'
}

export default meta

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed rgba(255,255,255,0.03)' }}>
    <div style={{ color: 'var(--text-secondary)' }}>{label}</div>
    <div style={{ color: 'var(--text-primary)' }}>{value}</div>
  </div>
)

export const Tokens = () => (
  <div style={{ padding: 20, background: 'var(--bg)', minHeight: '100vh' }}>
    <h3 style={{ color: 'var(--text-primary)' }}>Spacing</h3>
    <div style={{ width: 320, background: 'transparent', padding: 8 }}>
      {Object.entries(spacing).map(([k, v]) => (
        <Row key={k} label={`spacing.${k}`} value={`${v}px`} />
      ))}
    </div>

    <h3 style={{ color: 'var(--text-primary)', marginTop: 16 }}>Radii</h3>
    <div style={{ width: 320, padding: 8 }}>
      {Object.entries(radii).map(([k, v]) => (
        <Row key={k} label={`radii.${k}`} value={`${v}px`} />
      ))}
    </div>

    <h3 style={{ color: 'var(--text-primary)', marginTop: 16 }}>Typography</h3>
    <div style={{ width: 420, padding: 8 }}>
      {Object.entries(typography.sizes).map(([k, v]) => (
        <Row key={k} label={`type.size.${k}`} value={`${v}px`} />
      ))}
      <Row label={`font.family`} value={typography.fontFamily} />
    </div>

    <h3 style={{ color: 'var(--text-primary)', marginTop: 16 }}>Z Indices</h3>
    <div style={{ width: 320, padding: 8 }}>
      {Object.entries(zIndices).map(([k, v]) => (
        <Row key={k} label={`z.${k}`} value={`${v}`} />
      ))}
    </div>
  </div>
)
