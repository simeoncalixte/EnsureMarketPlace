import styled from 'styled-components'
import { colors, withAlpha } from '../colors'

export const Root = styled.div<{ $editing: boolean }>`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: ${colors.surfaceContainerHigh};
  border-radius: 10px;
  border: 1px solid ${({ $editing }) => ($editing ? withAlpha(colors.primary, 0.5) : 'transparent')};
  box-sizing: border-box;
`

export const Header = styled.div<{ $editing: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px 8px;
  cursor: ${({ $editing }) => ($editing ? 'move' : 'default')};
  user-select: none;
`

export const Title = styled.span`
  font-size: 12px;
  color: ${colors.onSurfaceVariant};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const HeaderActions = styled.div`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

export const IconButton = styled.button`
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${withAlpha(colors.primary, 0.14)};
  color: ${colors.primary};
  &:hover {
    background: ${withAlpha(colors.primary, 0.26)};
  }
`

export const RemoveButton = styled(IconButton)`
  background: ${withAlpha(colors.danger, 0.14)};
  color: ${colors.danger};
  font-size: 14px;
  &:hover {
    background: ${withAlpha(colors.danger, 0.26)};
  }
`

export const Body = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 0 16px 16px;
`

export default {}
