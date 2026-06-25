import React, { useState } from 'react'
import styled from 'styled-components'
import { colors } from '../colors'
import { spacing, typography } from '../tokens'
import Avatar from './Avatar'
import Input from './Input'
import Button from './Button'

export type XdsCommentItem = {
  id: number
  authorName: string
  body: string
  createdAt: string
}

export type XdsCommentThreadProps = {
  comments: XdsCommentItem[]
  onAddComment?: (body: string) => void | Promise<void>
  busy?: boolean
}

const Thread = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.md}px;
  font-family: ${typography.fontFamily};
`

const CommentRow = styled.div`
  display: flex;
  gap: ${spacing.sm}px;
  align-items: flex-start;
`

const CommentBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const AuthorName = styled.span`
  font-size: ${typography.sizes.sm}px;
  font-weight: ${typography.weights.bold};
  color: ${colors.onSurface};
`

const BodyText = styled.p`
  margin: 0;
  font-size: ${typography.sizes.sm}px;
  color: ${colors.onSurface};
  white-space: pre-wrap;
  word-break: break-word;
`

const Timestamp = styled.span`
  font-size: ${typography.sizes.xs}px;
  color: ${colors.onSurfaceVariant};
`

const EmptyState = styled.p`
  margin: 0;
  font-size: ${typography.sizes.sm}px;
  color: ${colors.onSurfaceVariant};
`

const ComposerRow = styled.div`
  display: flex;
  gap: ${spacing.sm}px;
  align-items: center;
`

export const CommentThread: React.FC<XdsCommentThreadProps> = ({
  comments,
  onAddComment,
  busy = false
}) => {
  const [draft, setDraft] = useState('')

  const trimmed = draft.trim()
  const disabled = trimmed.length === 0 || busy

  const submit = async () => {
    if (disabled || !onAddComment) return
    await onAddComment(trimmed)
    setDraft('')
  }

  return (
    <Thread>
      {comments.length === 0 ? (
        <EmptyState>No comments yet.</EmptyState>
      ) : (
        comments.map((comment) => (
          <CommentRow key={comment.id}>
            <Avatar name={comment.authorName} size="sm" />
            <CommentBody>
              <AuthorName>{comment.authorName}</AuthorName>
              <BodyText>{comment.body}</BodyText>
              <Timestamp>{comment.createdAt}</Timestamp>
            </CommentBody>
          </CommentRow>
        ))
      )}
      <ComposerRow>
        <Input
          placeholder="Write a comment…"
          value={draft}
          disabled={busy}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDraft(event.target.value)}
          onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void submit()
            }
          }}
        />
        <Button type="button" disabled={disabled} onClick={() => void submit()}>
          Comment
        </Button>
      </ComposerRow>
    </Thread>
  )
}

export default CommentThread
