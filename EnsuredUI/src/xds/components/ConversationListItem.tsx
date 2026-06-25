import React from 'react'
import styled, { css } from 'styled-components'
import { colors, withAlpha } from '../colors'
import { radii, spacing, typography } from '../tokens'
import Avatar from './Avatar'

export type XdsConversationListItemProps = {
  name: string
  avatarUrl?: string | null
  lastMessagePreview?: string | null
  lastMessageAt?: string | null
  unreadCount?: number
  active?: boolean
  onClick: () => void
}

const RowButton = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${spacing.sm}px;
  padding: ${spacing.sm}px ${spacing.md}px;
  border-radius: ${radii.md}px;
  border-left: 3px solid transparent;
  cursor: pointer;
  font-family: ${typography.fontFamily};
  outline: none;
  transition: background 0.15s;

  &:hover {
    background: ${withAlpha(colors.white, 0.04)};
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px ${withAlpha(colors.primary, 0.4)};
  }

  ${({ $active }: { $active: boolean }) =>
    $active &&
    css`
      background: ${withAlpha(colors.primary, 0.12)};
      border-left-color: ${colors.primary};
    `}
`

const Main = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const Name = styled.span<{ $unread: boolean }>`
  font-size: ${typography.sizes.sm}px;
  color: ${colors.onSurface};
  font-weight: ${({ $unread }: { $unread: boolean }) =>
    $unread ? typography.weights.bold : typography.weights.medium};
`

const Preview = styled.span`
  font-size: ${typography.sizes.xs}px;
  color: ${colors.onSurfaceVariant};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Side = styled.div`
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: ${spacing.xs}px;
`

const Timestamp = styled.span`
  font-size: ${typography.sizes.xs}px;
  color: ${colors.onSurfaceVariant};
`

const UnreadPill = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: ${radii.round}px;
  background: ${colors.primary};
  color: ${colors.onPrimary};
  font-size: ${typography.sizes.xs}px;
  font-weight: ${typography.weights.bold};
`

export const ConversationListItem: React.FC<XdsConversationListItemProps> = ({
  name,
  avatarUrl,
  lastMessagePreview,
  lastMessageAt,
  unreadCount,
  active = false,
  onClick
}) => {
  const unread = (unreadCount ?? 0) > 0

  return (
    <RowButton
      role="button"
      tabIndex={0}
      $active={active}
      onClick={onClick}
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
    >
      <Avatar name={name} src={avatarUrl} size="md" />
      <Main>
        <Name $unread={unread}>{name}</Name>
        {lastMessagePreview ? <Preview>{lastMessagePreview}</Preview> : null}
      </Main>
      <Side>
        {lastMessageAt ? <Timestamp>{lastMessageAt}</Timestamp> : null}
        {unread ? <UnreadPill>{unreadCount}</UnreadPill> : null}
      </Side>
    </RowButton>
  )
}

export default ConversationListItem
