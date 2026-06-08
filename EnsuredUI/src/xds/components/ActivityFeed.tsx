import React from 'react'
import styled, { keyframes } from 'styled-components'
import { colors, withAlpha } from '../colors'
import { spacing, radii, typography } from '../tokens'

export type ActivityFeedItem = {
  time: string
  tag?: string
  tagColor?: string
  source?: string
  message: React.ReactNode
}

export type ActivityFeedProps = {
  title?: React.ReactNode
  live?: boolean
  items: ActivityFeedItem[]
}

const Container = styled.section`
  display: flex;
  flex-direction: column;
  background: ${colors.surfaceContainerLow};
  border: 1px solid ${colors.outlineVariant};
  border-radius: ${radii.md}px;
  font-family: ${typography.fontFamily};
  color: ${colors.text.primary};
  overflow: hidden;
`

const Header = styled.header`
  display: flex;
  align-items: center;
  gap: ${spacing.sm}px;
  padding: ${spacing.sm}px ${spacing.md}px;
  border-bottom: 1px solid ${colors.outlineVariant};
`

const Title = styled.h3`
  margin: 0;
  font-size: ${typography.sizes.sm}px;
  font-weight: ${typography.weights.semibold};
  color: ${colors.text.primary};
  flex: 1;
`

const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 ${withAlpha(colors.secondary, 0.6)};
    opacity: 1;
  }
  70% {
    box-shadow: 0 0 0 6px ${withAlpha(colors.secondary, 0)};
    opacity: 0.85;
  }
  100% {
    box-shadow: 0 0 0 0 ${withAlpha(colors.secondary, 0)};
    opacity: 1;
  }
`

const LiveWrap = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${spacing.xs}px;
  font-size: ${typography.sizes.xs}px;
  font-weight: ${typography.weights.medium};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${colors.secondary};
`

const LiveDot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: ${radii.round}px;
  background: ${colors.secondary};
  animation: ${pulse} 1.6s ease-out infinite;
`

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`

const Item = styled.li`
  display: flex;
  align-items: baseline;
  gap: ${spacing.sm}px;
  padding: ${spacing.sm}px ${spacing.md}px;
  border-bottom: 1px solid ${colors.outlineVariant};

  &:last-child {
    border-bottom: none;
  }
`

const Time = styled.time`
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: ${typography.sizes.xs}px;
  color: ${colors.text.secondary};
  white-space: nowrap;
  flex-shrink: 0;
`

const TagChip = styled.span<{ $tagColor: string }>`
  display: inline-flex;
  align-items: center;
  font-size: 10px;
  font-weight: ${typography.weights.semibold};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 1px ${spacing.xs}px;
  border-radius: ${radii.sm}px;
  color: ${colors.neutral[0]};
  background: ${(p) => p.$tagColor};
  white-space: nowrap;
  flex-shrink: 0;
`

const Source = styled.span`
  font-size: ${typography.sizes.xs}px;
  font-weight: ${typography.weights.medium};
  color: ${colors.text.accent};
  white-space: nowrap;
  flex-shrink: 0;
`

const Message = styled.span`
  font-size: ${typography.sizes.sm}px;
  color: ${colors.text.primary};
  word-break: break-word;
`

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ title, live = false, items }) => {
  const showHeader = title != null || live

  return (
    <Container>
      {showHeader && (
        <Header>
          {title != null && <Title>{title}</Title>}
          {live && (
            <LiveWrap>
              <LiveDot data-testid="activity-feed-live-dot" aria-hidden="true" />
              Live
            </LiveWrap>
          )}
        </Header>
      )}
      <List role="list">
        {items.map((item, index) => (
          <Item key={`${item.time}-${index}`}>
            <Time>{item.time}</Time>
            {item.tag && <TagChip $tagColor={item.tagColor ?? colors.neutral[600]}>{item.tag}</TagChip>}
            {item.source && <Source>{item.source}</Source>}
            <Message>{item.message}</Message>
          </Item>
        ))}
      </List>
    </Container>
  )
}

export default ActivityFeed
