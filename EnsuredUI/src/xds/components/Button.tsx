import React from 'react'
import { colors } from '../../xds/colors'

export type XdsButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
}

export const Button: React.FC<XdsButtonProps> = ({ variant = 'primary', children, style, ...rest }) => {
  const background =
    variant === 'primary' ? colors.brand[500] : variant === 'secondary' ? colors.neutral[300] : 'transparent'
  const color = variant === 'primary' ? '#fff' : colors.text.primary

  const base: React.CSSProperties = {
    padding: '8px 14px',
    borderRadius: 8,
    border: variant === 'ghost' ? '1px solid transparent' : 'none',
    cursor: 'pointer',
    background,
    color,
    fontWeight: 600,
    fontFamily: 'Inter, system-ui, sans-serif'
  }

  return (
    <button style={{ ...base, ...style }} {...rest}>
      {children}
    </button>
  )
}

export default Button
