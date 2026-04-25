import React from 'react'
import { colors } from '../colors'

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ children, style, ...rest }) => {
  return (
    <div style={{ position: 'relative' }}>
      <select {...rest} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: colors.surfaceContainer, border: 'none', color: colors.text.primary, ...style }}>
        {children}
      </select>
      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: colors.onSurfaceVariant, pointerEvents: 'none' }}>▾</span>
    </div>
  )
}

export default Select
