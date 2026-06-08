import React from 'react'
import styled from 'styled-components'
import { colors } from '../colors'

const Message = styled.div`
  color: ${colors.dangerBright};
  font-size: 12px;
  margin-top: 4px;
`

export type ValidationMessageProps = {
  children: React.ReactNode
  id?: string
  role?: 'alert' | 'status'
}

export const ValidationMessage: React.FC<ValidationMessageProps> = ({ children, id, role = 'alert' }) => {
  return (
    <Message id={id} role={role}>
      {children}
    </Message>
  )
}

export default ValidationMessage
