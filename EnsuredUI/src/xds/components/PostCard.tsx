import React from 'react'
import styled, { css } from 'styled-components'
import { colors, withAlpha } from '../colors'
import { radii, spacing, typography } from '../tokens'
import Avatar from './Avatar'

export type XdsPostCardProps = {
  authorName: string
  authorHeadline?: string | null
  avatarUrl?: string | null
  content: string
  createdAt: string
  likeCount: number
  commentCount: number
  likedByViewer: boolean
  onToggleLike?: () => void
  onToggleComments?: () => void
  onAuthorClick?: () => void
  canDelete?: boolean
  onDelete?: () => void
  children?: React.ReactNode
}

const Surface = styled.article`
  background: ${colors.surfaceRaised};
  padding: ${spacing.lg}px;
  border-radius: ${radii.lg}px;
  border: 1px solid ${withAlpha(colors.white, 0.05)};
  font-family: ${typography.fontFamily};
`

const Header = styled.header`
  display: flex;
  align-items: flex-start;
  gap: ${spacing.md}px;
`

const HeaderText = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const AuthorName = styled.span<{ $clickable: boolean }>`
  color: ${colors.text.primary};
  font-size: ${typography.sizes.sm}px;
  font-weight: ${typography.weights.bold};

  ${(p: { $clickable: boolean }) =>
    p.$clickable &&
    css`
      cursor: pointer;

      &:hover {
        color: ${colors.primary};
        text-decoration: underline;
      }
    `}
`

const Headline = styled.span`
  color: ${colors.text.secondary};
  font-size: ${typography.sizes.xs}px;
`

const Timestamp = styled.span`
  color: ${colors.onSurfaceVariant};
  font-size: ${typography.sizes.xs}px;
`

const DeleteButton = styled.button`
  flex: 0 0 auto;
  background: transparent;
  border: none;
  border-radius: ${radii.sm}px;
  color: ${colors.onSurfaceVariant};
  cursor: pointer;
  font-size: ${typography.sizes.sm}px;
  line-height: 1;
  padding: ${spacing.xs}px;

  &:hover {
    color: ${colors.danger};
    background: ${withAlpha(colors.danger, 0.12)};
  }
`

const Content = styled.p`
  margin: ${spacing.md}px 0;
  color: ${colors.text.primary};
  font-size: ${typography.sizes.sm}px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: break-word;
`

const Footer = styled.footer`
  display: flex;
  align-items: center;
  gap: ${spacing.sm}px;
  border-top: 1px solid ${colors.outlineVariant};
  padding-top: ${spacing.sm}px;
`

const FooterButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: ${(p: { $active?: boolean }) =>
    p.$active ? withAlpha(colors.primary, 0.16) : 'transparent'};
  border: 1px solid
    ${(p: { $active?: boolean }) =>
      p.$active ? withAlpha(colors.primary, 0.3) : 'transparent'};
  border-radius: ${radii.md}px;
  color: ${(p: { $active?: boolean }) => (p.$active ? colors.primary : colors.text.secondary)};
  cursor: pointer;
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.xs}px;
  font-weight: ${typography.weights.semibold};
  padding: 6px 10px;

  &:hover {
    background: ${withAlpha(colors.primary, 0.1)};
    color: ${colors.primary};
  }
`

const ChildrenSlot = styled.div`
  margin-top: ${spacing.md}px;
`

export const PostCard: React.FC<XdsPostCardProps> = ({
  authorName,
  authorHeadline,
  avatarUrl,
  content,
  createdAt,
  likeCount,
  commentCount,
  likedByViewer,
  onToggleLike,
  onToggleComments,
  onAuthorClick,
  canDelete = false,
  onDelete,
  children
}) => {
  const authorClickable = Boolean(onAuthorClick)

  return (
    <Surface>
      <Header>
        <Avatar name={authorName} src={avatarUrl} size="md" />
        <HeaderText>
          <AuthorName
            $clickable={authorClickable}
            onClick={onAuthorClick}
            {...(authorClickable ? { role: 'button', tabIndex: 0 } : {})}
          >
            {authorName}
          </AuthorName>
          {authorHeadline ? <Headline>{authorHeadline}</Headline> : null}
          <Timestamp>{createdAt}</Timestamp>
        </HeaderText>
        {canDelete ? (
          <DeleteButton type="button" aria-label="Delete post" onClick={onDelete}>
            ✕
          </DeleteButton>
        ) : null}
      </Header>

      <Content>{content}</Content>

      <Footer>
        <FooterButton
          type="button"
          $active={likedByViewer}
          aria-pressed={likedByViewer}
          onClick={onToggleLike}
        >
          {likedByViewer ? '♥' : '♡'} Like · {likeCount}
        </FooterButton>
        <FooterButton type="button" onClick={onToggleComments}>
          💬 Comments · {commentCount}
        </FooterButton>
      </Footer>

      {children ? <ChildrenSlot>{children}</ChildrenSlot> : null}
    </Surface>
  )
}

export default PostCard
