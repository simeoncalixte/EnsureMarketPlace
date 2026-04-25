import React from 'react'
import { colors } from '../colors'

export const SegmentedSwitch: React.FC<{ options: string[]; value?: number; onChange?: (i: number) => void }> = ({ options, value = 0, onChange }) => {
  return (
    <div style={{ display: 'flex', background: colors.surfaceContainer, borderRadius: 10, padding: 4 }}>
      {options.map((opt, i) => {
        const active = i === value
        return (
          <button key={opt} onClick={() => onChange?.(i)} style={{ flex: 1, padding: '6px 8px', fontSize: 12, fontWeight: 700, borderRadius: 8, border: 'none', background: active ? colors.surfaceContainerHigh : 'transparent', color: active ? colors.primary : colors.onSurfaceVariant, cursor: 'pointer' }}>
            {opt}
          </button>
        )
      })}
    </div>
  )
}

export default SegmentedSwitch
