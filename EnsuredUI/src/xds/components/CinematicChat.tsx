import React, { useEffect, useRef } from 'react'
import styled, { keyframes } from 'styled-components'
import { colors, withAlpha } from '../colors'
import { radii, spacing, typography, zIndices } from '../tokens'

export type CinematicChatRole = 'user' | 'assistant'

export type CinematicChatMessage = {
  id: string
  role: CinematicChatRole
  content: string
  /** Optional pre-formatted timestamp label (the component renders it verbatim). */
  timestamp?: string
}

export type CinematicChatProps = {
  open: boolean
  title?: string
  subtitle?: string
  messages?: CinematicChatMessage[]
  /** Controlled composer value. */
  draft?: string
  placeholder?: string
  /** Prompt chips shown while the conversation is empty. */
  suggestions?: string[]
  /** Shows the assistant typing indicator under the last message. */
  isResponding?: boolean
  onClose?: () => void
  onDraftChange?: (value: string) => void
  onSend?: (message: string) => void
  onSuggestionSelect?: (suggestion: string) => void
}

const overlayIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`

const stageIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-1.5rem);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`

const dotPulse = keyframes`
  0%, 80%, 100% {
    opacity: 0.25;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-0.2rem);
  }
`

/* Netflix-style cinematic scrim: near-opaque over the left rail where the
   conversation lives, fading out to the right so the app stays visible behind it. */
const Overlay = styled.div`
  /* The app has no global box-sizing reset; scope one here so width:100% +
     padding inside the overlay never overflows the viewport. */
  &,
  & * {
    box-sizing: border-box;
  }

  position: fixed;
  inset: 0;
  z-index: ${zIndices.modal};
  display: flex;
  background:
    radial-gradient(circle at 0% 0%, ${withAlpha(colors.primary, 0.16)}, transparent 34%),
    linear-gradient(
      90deg,
      ${withAlpha(colors.scrim, 0.97)} 0%,
      ${withAlpha(colors.scrim, 0.94)} 26rem,
      ${withAlpha(colors.scrim, 0.78)} 38rem,
      ${withAlpha(colors.scrim, 0.42)} 60%,
      ${withAlpha(colors.scrim, 0.18)} 100%
    );
  backdrop-filter: blur(3px) saturate(1.05);
  animation: ${overlayIn} 240ms ease both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const Stage = styled.section`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  width: min(34rem, 100%);
  padding: ${spacing.md}px;
  animation: ${stageIn} 320ms cubic-bezier(0.22, 1, 0.36, 1) both;

  @media (min-width: 640px) {
    padding: ${spacing.lg}px ${spacing.lg}px ${spacing.md}px;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

/* Invisible right-hand remainder: clicking the visible app behind the scrim
   dismisses the takeover, mirroring how a backdrop click closes a modal. */
const BackdropDismiss = styled.button`
  flex: 1;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;

  @media (max-width: 640px) {
    display: none;
  }
`

const Header = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${spacing.md}px;
  padding-bottom: ${spacing.md}px;
  border-bottom: 1px solid ${withAlpha(colors.primarySoft, 0.12)};
`

const HeaderCopy = styled.div`
  display: grid;
  gap: 0.25rem;
`

const Title = styled.h2`
  margin: 0;
  color: ${colors.onSurfaceStrong};
  font-size: ${typography.sizes.lg}px;
  font-weight: ${typography.weights.bold};
  letter-spacing: -0.03em;
`

const Subtitle = styled.p`
  margin: 0;
  color: ${colors.onSurfaceVariant};
  font-size: ${typography.sizes.sm}px;
`

const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
  border: 1px solid ${withAlpha(colors.primarySoft, 0.18)};
  border-radius: ${radii.round}px;
  background: ${withAlpha(colors.surfaceRaised, 0.7)};
  color: ${colors.onSurfaceMuted};
  font-size: ${typography.sizes.sm}px;
  line-height: 1;
  cursor: pointer;
  transition: color 140ms ease, border-color 140ms ease, transform 140ms ease;

  &:hover {
    color: ${colors.onSurfaceStrong};
    border-color: ${withAlpha(colors.primarySoft, 0.4)};
  }

  &:active {
    transform: scale(0.94);
  }
`

const Transcript = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: ${spacing.md}px;
  overflow-y: auto;
  padding: ${spacing.lg}px 0;
`

const EmptyState = styled.div`
  margin: auto 0;
  display: grid;
  justify-items: start;
  gap: ${spacing.md}px;
  text-align: left;
`

const EmptyGlyph = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  border: 1px solid ${withAlpha(colors.primarySoft, 0.25)};
  border-radius: ${radii.round}px;
  background: ${withAlpha(colors.primary, 0.12)};
  color: ${colors.primarySoft};
  font-size: ${typography.sizes.lg}px;
`

const EmptyTitle = styled.h3`
  margin: 0;
  color: ${colors.onSurfaceStrong};
  font-size: ${typography.sizes['2xl']}px;
  font-weight: ${typography.weights.bold};
  letter-spacing: -0.04em;
  line-height: 1.05;
`

const EmptyHint = styled.p`
  margin: 0;
  color: ${colors.onSurfaceVariant};
  font-size: ${typography.sizes.sm}px;
  line-height: 1.6;
`

const SuggestionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: ${spacing.sm}px;
`

const SuggestionChip = styled.button`
  border: 1px solid ${withAlpha(colors.primarySoft, 0.22)};
  border-radius: ${radii.round}px;
  background: ${withAlpha(colors.surfaceRaised, 0.65)};
  color: ${colors.onSurfaceMuted};
  padding: 0.5rem 0.9rem;
  font-family: inherit;
  font-size: ${typography.sizes.xs}px;
  font-weight: ${typography.weights.semibold};
  cursor: pointer;
  transition: color 140ms ease, border-color 140ms ease, background 140ms ease;

  &:hover {
    color: ${colors.onSurfaceStrong};
    border-color: ${withAlpha(colors.primary, 0.5)};
    background: ${withAlpha(colors.primary, 0.12)};
  }
`

const MessageRow = styled.div<{ $role: CinematicChatRole }>`
  display: grid;
  gap: 0.3rem;
  justify-items: ${({ $role }) => ($role === 'user' ? 'end' : 'start')};
`

const Bubble = styled.div<{ $role: CinematicChatRole }>`
  max-width: 92%;
  padding: 0.75rem 1rem;
  border-radius: ${radii.lg}px;
  font-size: ${typography.sizes.sm}px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;

  ${({ $role }) =>
    $role === 'user'
      ? `
        background: ${withAlpha(colors.primary, 0.22)};
        border: 1px solid ${withAlpha(colors.primary, 0.4)};
        color: ${colors.onSurfaceStrong};
        border-bottom-right-radius: ${radii.sm}px;
      `
      : `
        background: ${withAlpha(colors.surfaceRaised, 0.85)};
        border: 1px solid ${withAlpha(colors.primarySoft, 0.14)};
        color: ${colors.onSurfaceMuted};
        border-bottom-left-radius: ${radii.sm}px;
      `}
`

const MessageMeta = styled.span`
  color: ${colors.outline};
  font-family: monospace;
  font-size: 0.625rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`

const TypingIndicator = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.75rem 1rem;
  border: 1px solid ${withAlpha(colors.primarySoft, 0.14)};
  border-radius: ${radii.lg}px;
  border-bottom-left-radius: ${radii.sm}px;
  background: ${withAlpha(colors.surfaceRaised, 0.85)};
`

const TypingDot = styled.span<{ $delay: number }>`
  width: 0.375rem;
  height: 0.375rem;
  border-radius: ${radii.round}px;
  background: ${colors.primarySoft};
  animation: ${dotPulse} 1.1s ease-in-out ${({ $delay }) => $delay}ms infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.6;
  }
`

const Composer = styled.form`
  display: flex;
  align-items: flex-end;
  gap: ${spacing.sm}px;
  padding: ${spacing.sm}px;
  border: 1px solid ${withAlpha(colors.primarySoft, 0.18)};
  border-radius: ${radii.lg}px;
  background: ${withAlpha(colors.surfacePanel, 0.92)};
  box-shadow: 0 24px 60px -20px ${withAlpha(colors.background, 0.9)};
  transition: border-color 160ms ease;

  &:focus-within {
    border-color: ${withAlpha(colors.primary, 0.55)};
  }
`

const ComposerInput = styled.textarea`
  flex: 1;
  min-height: 2.75rem;
  max-height: 9rem;
  resize: none;
  border: 0;
  background: transparent;
  padding: 0.65rem 0.5rem;
  color: ${colors.onSurfaceStrong};
  font-family: inherit;
  font-size: ${typography.sizes.sm}px;
  line-height: 1.5;
  outline: none;

  &::placeholder {
    color: ${colors.outline};
  }
`

const SendButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
  border: 0;
  border-radius: ${radii.md}px;
  background: ${colors.primary};
  color: ${colors.onPrimary};
  font-size: ${typography.sizes.md}px;
  line-height: 1;
  cursor: pointer;
  transition: filter 140ms ease, transform 140ms ease, opacity 140ms ease;

  &:hover:not(:disabled) {
    filter: brightness(1.1);
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

const ComposerHint = styled.p`
  margin: 0.5rem 0 0;
  text-align: left;
  color: ${colors.outline};
  font-family: monospace;
  font-size: 0.625rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`

/**
 * Full-screen cinematic chat takeover, Netflix-style: the conversation occupies
 * a left rail under a gradient scrim that fades out rightward, keeping the app
 * visible behind it. Pure and presentational — conversation state, escape
 * handling, and focus management belong to the caller (see the GlobalChat
 * app-section, which owns the open/close orchestration).
 */
export const CinematicChat: React.FC<CinematicChatProps> = ({
  open,
  title = 'Ensured Copilot',
  subtitle = 'Ask anything about your portfolio, submissions, or coverage.',
  messages = [],
  draft = '',
  placeholder = 'Ask the copilot…',
  suggestions = [],
  isResponding = false,
  onClose,
  onDraftChange,
  onSend,
  onSuggestionSelect
}) => {
  const transcriptRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const transcript = transcriptRef.current
    if (transcript) {
      transcript.scrollTop = transcript.scrollHeight
    }
  }, [messages, isResponding])

  if (!open) return null

  const trimmedDraft = draft.trim()

  const submitDraft = () => {
    if (trimmedDraft) {
      onSend?.(trimmedDraft)
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submitDraft()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submitDraft()
    }
  }

  return (
    <Overlay role="dialog" aria-modal="true" aria-label={title}>
      <Stage>
        <Header>
          <HeaderCopy>
            <Title>{title}</Title>
            {subtitle ? <Subtitle>{subtitle}</Subtitle> : null}
          </HeaderCopy>
          <CloseButton type="button" aria-label="Close chat" onClick={onClose}>
            ✕
          </CloseButton>
        </Header>

        <Transcript ref={transcriptRef}>
          {messages.length === 0 && !isResponding ? (
            <EmptyState>
              <EmptyGlyph aria-hidden="true">✦</EmptyGlyph>
              <EmptyTitle>{title}</EmptyTitle>
              <EmptyHint>{subtitle}</EmptyHint>
              {suggestions.length > 0 ? (
                <SuggestionRow>
                  {suggestions.map((suggestion) => (
                    <SuggestionChip
                      key={suggestion}
                      type="button"
                      onClick={() => onSuggestionSelect?.(suggestion)}
                    >
                      {suggestion}
                    </SuggestionChip>
                  ))}
                </SuggestionRow>
              ) : null}
            </EmptyState>
          ) : (
            <>
              {messages.map((message) => (
                <MessageRow key={message.id} $role={message.role}>
                  <Bubble $role={message.role} data-testid={`chat-message-${message.role}`}>
                    {message.content}
                  </Bubble>
                  {message.timestamp ? <MessageMeta>{message.timestamp}</MessageMeta> : null}
                </MessageRow>
              ))}
              {isResponding ? (
                <MessageRow $role="assistant">
                  <TypingIndicator aria-label="Assistant is responding">
                    <TypingDot $delay={0} />
                    <TypingDot $delay={150} />
                    <TypingDot $delay={300} />
                  </TypingIndicator>
                </MessageRow>
              ) : null}
            </>
          )}
        </Transcript>

        <Composer onSubmit={handleSubmit}>
          <ComposerInput
            aria-label="Chat message"
            value={draft}
            placeholder={placeholder}
            rows={1}
            onChange={(event) => onDraftChange?.(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <SendButton type="submit" aria-label="Send message" disabled={!trimmedDraft}>
            ➤
          </SendButton>
        </Composer>
        <ComposerHint>Enter to send · Shift+Enter for a new line · Esc to close</ComposerHint>
      </Stage>
      <BackdropDismiss type="button" aria-label="Dismiss chat" onClick={onClose} />
    </Overlay>
  )
}

export default CinematicChat
