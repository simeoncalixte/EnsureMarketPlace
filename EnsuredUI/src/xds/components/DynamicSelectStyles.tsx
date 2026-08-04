import styled from 'styled-components'
import { colors } from '../colors'

export const Wrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const Grow = styled.div`
  flex: 1 1 auto;
  min-width: 0;
`

export const ManageBtn = styled.button`
  flex: 0 0 auto;
  border: 1px solid ${colors.outlineVariant};
  background: transparent;
  color: ${colors.onSurfaceVariant};
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: ${colors.surfaceContainerHigh};
    color: ${colors.onSurface};
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`

export const Note = styled.div`
  font-size: 12px;
  color: ${colors.onSurfaceVariant};
  margin-top: 4px;
`

export default {}
