import React from 'react'
import { colors } from '../colors'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input: React.FC<InputProps> = ({ placeholder, style, ...rest }) => {
  return (
    <input
      {...rest}
      placeholder={placeholder}
      style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${colors.outlineVariant}`, padding: '8px 0', color: colors.text.primary, outline: 'none', ...style }}
    />
  )
}

export default Input
