import React, { useState } from 'react'
import { Link } from 'react-router'
import { colors } from '../../xds/colors'
import { spacing, radii } from '../../xds/tokens'

export type NavItem = {
  id: string
  label: string
  active?: boolean
  icon?: string // name or glyph to render in the leading slot
  shortcut?: string // small right-aligned shortcut label
  subItems?: NavItem[]
}

export const Navigation: React.FC<{ items: NavItem[]; showSubroutes?: boolean; onItemClick?: () => void }> = ({ items, showSubroutes = true, onItemClick }) => {
  const [hover, setHover] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const containerStyle: React.CSSProperties = {
    width: 260,
    background: colors.ui?.navItemBg ?? colors.surface,
    padding: spacing.md,
    color: colors.text.primary,
    borderRadius: radii.md
  }

  const hexToRgba = (hex: string, alpha = 1) => {
    const h = hex.replace('#', '')
    const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
    const r = (bigint >> 16) & 255
    const g = (bigint >> 8) & 255
    const b = bigint & 255
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  return (
    <nav style={containerStyle}>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((it) => {
          const isActive = !!it.active
          const isHover = hover === it.id

          // Use the exact accent hex requested, with a 10% left gradient
          const accentHex = '#4b8eff'
          const leftColor = accentHex
          const transparentRight = hexToRgba(leftColor, 0)
          const bg = isActive || isHover
            ? `linear-gradient(90deg, ${hexToRgba(leftColor, 0.1)} 0%, ${transparentRight} 70%)`
            : 'transparent'

          // active text uses the accent hex color
          const color = isActive ? leftColor : colors.text.secondary

          // visible solid left border when active/hover (2px per design)
          const borderLeft = isActive || isHover ? `2px solid ${leftColor}` : '2px solid transparent'

          const linkStyle: React.CSSProperties = {
            display: 'block',
            padding: '12px 16px', // py-3 px-4
            borderRadius: radii.sm,
            textDecoration: 'none',
            color,
            background: bg,
            borderLeft,
            boxShadow: isActive ? '0 6px 18px rgba(15,23,42,0.45)' : undefined,
            transition: 'background 160ms ease, box-shadow 160ms ease, color 120ms ease',
            fontSize: 14
          }

          const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
            if (it.subItems && showSubroutes) {
              // Allow navigation to the parent route while also toggling the
              // expanded state so users land on the parent page (e.g. PipelineIngestion)
              // and still see the nested sub-items.
              setExpanded(prev => (prev === it.id ? null : it.id))
              // do not call preventDefault - allow Link to navigate
            }

            onItemClick?.()
          }

          return (
            <li key={it.id} style={{ marginBottom: spacing.sm }}>
              <Link
                to={it.id}
                style={linkStyle}
                onMouseEnter={() => setHover(it.id)}
                onMouseLeave={() => setHover(null)}
                onClick={handleClick}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ color: color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20 }} aria-hidden>
                      {it.icon ?? '🏛️'}
                    </span>
                    <span style={{ color: color, outline: 'none' }} contentEditable={false} suppressContentEditableWarning>
                      {it.label}
                    </span>
                  </div>

                  <span style={{ fontSize: 10, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace', opacity: 0.6 }}>
                    {it.shortcut ?? ''}
                  </span>
                </div>
              </Link>
              {/* Render sub-items when present and allowed by flag and expanded/active state */}
              {it.subItems && showSubroutes && (expanded === it.id || isActive) && (
                <ul style={{ listStyle: 'none', padding: 0, margin: 8 }}>
                  {it.subItems.map(sub => {
                    const subStyle: React.CSSProperties = {
                      display: 'block',
                      padding: '8px 16px',
                      borderRadius: radii.sm,
                      textDecoration: 'none',
                      color: colors.text.secondary,
                      background: 'transparent',
                      marginLeft: 20,
                      fontSize: 13
                    }

                    return (
                      <li key={sub.id} style={{ marginBottom: spacing.xs }}>
                        <Link to={sub.id} style={subStyle} onClick={() => onItemClick?.()}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ width: 16 }}>{sub.icon ?? '•'}</span>
                            <span>{sub.label}</span>
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default Navigation
