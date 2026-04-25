import React from 'react'
import { colors } from '../colors'
import { spacing, typography } from '../tokens'

export type BreadcrumbItem = {
  label: string
  href?: string
}

export const Breadcrumb: React.FC<{ label?: string; items: BreadcrumbItem[] }> = ({ label = 'Breadcrumbs', items }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      <div>
        <label style={{ fontSize: 10, fontFamily: 'ui-monospace, Menlo, monospace', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>{label}</label>
        <nav aria-label="breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
          {items.map((it, idx) => {
            const isLast = idx === items.length - 1
            return (
              <React.Fragment key={idx}>
                {isLast ? (
                  <span style={{ color: colors.text.primary }}>{it.label}</span>
                ) : (
                  <a href={it.href ?? '#'} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
                    {it.label}
                  </a>
                )}
                {!isLast && <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>›</span>}
              </React.Fragment>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

export default Breadcrumb
