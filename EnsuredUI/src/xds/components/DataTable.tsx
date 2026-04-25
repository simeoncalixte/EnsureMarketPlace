import React from 'react'
import { colors } from '../colors'

export type Row = { id: string; tranche: string; value: string; status: string; statusVariant?: 'secondary' | 'primary' | 'error' }

export const DataTable: React.FC<{ rows: Row[] }> = ({ rows }) => {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'ui-monospace, Menlo, monospace' }}>
      <thead>
        <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
          <th style={{ padding: '12px', fontSize: 10, textTransform: 'uppercase', color: colors.onSurfaceVariant }}>Contract ID</th>
          <th style={{ padding: '12px', fontSize: 10, textTransform: 'uppercase', color: colors.onSurfaceVariant }}>Tranche</th>
          <th style={{ padding: '12px', fontSize: 10, textTransform: 'uppercase', color: colors.onSurfaceVariant, textAlign: 'right' }}>Value (USD)</th>
          <th style={{ padding: '12px', fontSize: 10, textTransform: 'uppercase', color: colors.onSurfaceVariant, textAlign: 'center' }}>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} style={{ borderTop: `1px solid rgba(148,163,184,0.06)`, cursor: 'pointer' }}>
            <td style={{ padding: 12, color: colors.text.primary }}>{r.id}</td>
            <td style={{ padding: 12, color: colors.onSurfaceVariant }}>{r.tranche}</td>
            <td style={{ padding: 12, textAlign: 'right', color: colors.text.primary }}>{r.value}</td>
            <td style={{ padding: 12, textAlign: 'center' }}>
              <span style={{ padding: '6px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700, background: r.statusVariant === 'secondary' ? 'rgba(75,142,255,0.08)' : r.statusVariant === 'error' ? 'rgba(255,107,107,0.08)' : 'rgba(120,120,120,0.06)', color: r.statusVariant === 'error' ? colors.error : r.statusVariant === 'secondary' ? colors.primary : colors.onSurfaceVariant }}>{r.status}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default DataTable
