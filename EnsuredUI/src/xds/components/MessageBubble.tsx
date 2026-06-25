import React from 'react'
import styled from 'styled-components'
import { colors, withAlpha } from '../colors'
import { radii, spacing, typography } from '../tokens'
import Badge from './Badge'

export type XdsMessageBubbleProps = {
  mine: boolean
  kind: 'text' | 'submission_share' | 'attachment'
  body?: string | null
  senderName?: string | null
  createdAt: string
  submissionLabel?: string | null
  attachmentName?: string | null
  attachmentUrl?: string | null
  externalProvider?: 'whatsapp' | 'telegram' | null
  onOpenSubmission?: () => void
}

const Row = styled.div<{ $mine: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ $mine }: { $mine: boolean }) => ($mine ? 'flex-end' : 'flex-start')};
  font-family: ${typography.fontFamily};
`

const SenderName = styled.span`
  font-size: ${typography.sizes.xs}px;
  color: ${colors.onSurfaceVariant};
  margin-bottom: 2px;
`

const Bubble = styled.div<{ $mine: boolean }>`
  max-width: 70%;
  padding: ${spacing.sm}px ${spacing.md}px;
  border-radius: ${radii.lg}px;
  background: ${({ $mine }: { $mine: boolean }) =>
    $mine ? withAlpha(colors.primary, 0.18) : colors.surfaceRaised};
  border: 1px solid
    ${({ $mine }: { $mine: boolean }) =>
      $mine ? withAlpha(colors.primary, 0.3) : withAlpha(colors.white, 0.05)};
  color: ${colors.onSurface};
  display: flex;
  flex-direction: column;
  gap: ${spacing.sm}px;
`

const BodyText = styled.p`
  margin: 0;
  font-size: ${typography.sizes.sm}px;
  white-space: pre-wrap;
  word-break: break-word;
`

const MiniCard = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.sm}px;
  padding: ${spacing.sm}px;
  border-radius: ${radii.md}px;
  background: ${colors.surfaceContainerHigh};
  border: 1px solid ${colors.outlineVariant};
  font-size: ${typography.sizes.sm}px;
`

const Marker = styled.span`
  flex: 0 0 auto;
`

const SubmissionLabel = styled.span`
  font-weight: ${typography.weights.semibold};
  color: ${colors.onSurface};
`

const LinkButton = styled.button`
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  color: ${colors.primary};
  font-size: ${typography.sizes.sm}px;
  font-family: ${typography.fontFamily};
  text-decoration: underline;
`

const AttachmentLink = styled.a`
  color: ${colors.primary};
  text-decoration: underline;
  word-break: break-all;
`

const AttachmentName = styled.span`
  color: ${colors.onSurface};
  word-break: break-all;
`

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.sm}px;
  margin-top: 2px;
`

const Timestamp = styled.span`
  font-size: ${typography.sizes.xs}px;
  color: ${colors.onSurfaceVariant};
`

const providerLabel: Record<'whatsapp' | 'telegram', string> = {
  whatsapp: 'via WhatsApp',
  telegram: 'via Telegram'
}

export const MessageBubble: React.FC<XdsMessageBubbleProps> = ({
  mine,
  kind,
  body,
  senderName,
  createdAt,
  submissionLabel,
  attachmentName,
  attachmentUrl,
  externalProvider,
  onOpenSubmission
}) => {
  return (
    <Row $mine={mine}>
      {!mine && senderName ? <SenderName>{senderName}</SenderName> : null}
      <Bubble $mine={mine}>
        {kind === 'submission_share' ? (
          <MiniCard>
            <Marker aria-hidden="true">📋</Marker>
            <SubmissionLabel>{submissionLabel}</SubmissionLabel>
            <LinkButton type="button" onClick={onOpenSubmission}>
              View submission
            </LinkButton>
          </MiniCard>
        ) : null}
        {kind === 'attachment' ? (
          <MiniCard>
            <Marker aria-hidden="true">📎</Marker>
            {attachmentUrl ? (
              <AttachmentLink href={attachmentUrl} target="_blank" rel="noopener noreferrer">
                {attachmentName}
              </AttachmentLink>
            ) : (
              <AttachmentName>{attachmentName}</AttachmentName>
            )}
          </MiniCard>
        ) : null}
        {body ? <BodyText>{body}</BodyText> : null}
      </Bubble>
      <MetaRow>
        <Timestamp>{createdAt}</Timestamp>
        {externalProvider ? <Badge variant="neutral">{providerLabel[externalProvider]}</Badge> : null}
      </MetaRow>
    </Row>
  )
}

export default MessageBubble
