import styled from 'styled-components'
import { colors, withAlpha } from '../colors'

export const Root = styled.div`
  padding: 1.5rem 2rem 2.5rem;
`

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`

export const Spacer = styled.div`
  flex: 1 1 auto;
`

export const SourceTag = styled.span`
  font-size: 11px;
  color: ${colors.onSurfaceVariant};
  text-transform: uppercase;
  letter-spacing: 0.08em;
`

export const ScopeSwitch = styled.div`
  display: inline-flex;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid ${colors.outlineVariant};
`

export const ScopeButton = styled.button<{ $active: boolean }>`
  border: none;
  cursor: pointer;
  padding: 6px 12px;
  font-size: 12px;
  background: ${({ $active }) => ($active ? withAlpha(colors.primary, 0.18) : 'transparent')};
  color: ${({ $active }) => ($active ? colors.primary : colors.onSurfaceVariant)};
`

export const AddPanel = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 14px;
  margin-bottom: 16px;
  border-radius: 10px;
  border: 1px dashed ${colors.outlineVariant};
`

export const AddChip = styled.button`
  border: 1px solid ${colors.outlineVariant};
  border-radius: 999px;
  background: transparent;
  color: ${colors.onSurface};
  cursor: pointer;
  font-size: 12px;
  padding: 5px 12px;
  &:hover {
    border-color: ${withAlpha(colors.primary, 0.6)};
    color: ${colors.primary};
  }
`

export const Empty = styled.div`
  color: ${colors.onSurfaceVariant};
  font-size: 13px;
  padding: 8px 0;
`

export const PresetLabel = styled.div`
  flex-basis: 100%;
  margin-top: 6px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${colors.onSurfaceVariant};
`

export const StatusText = styled.span<{ $error?: boolean }>`
  font-size: 12px;
  color: ${({ $error }) => ($error ? colors.danger : colors.onSurfaceVariant)};
`

export default {}
