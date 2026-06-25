import React, { useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { colors, withAlpha } from '../colors'
import { radii, spacing, typography } from '../tokens'
import { Badge, type XdsBadgeVariant } from './Badge'

export type AgentTranscriptCallStatus = 'running' | 'completed' | 'failed'

/**
 * One LLM agent call: the prompt the pipeline sent and the raw model response.
 * `prompt`/`response` are rendered verbatim (pre-wrap), so callers pass the
 * exact text exchanged with the model.
 */
export type AgentTranscriptCall = {
  id: string
  /** Pipeline stage the call belongs to, e.g. "Classification". */
  stageLabel: string
  /** Which agent made the call, e.g. "Line-of-business classifier". */
  agentLabel: string
  model?: string | null
  promptVersion?: string | null
  status: AgentTranscriptCallStatus
  durationMs?: number | null
  /** Optional pre-formatted timestamp label (rendered verbatim). */
  timestamp?: string
  prompt: string
  response?: string | null
  errorMessage?: string | null
}

export type AgentTranscriptProps = {
  calls: AgentTranscriptCall[]
  /** Shown when there are no calls (agents have not run for this item yet). */
  emptyMessage?: string
}

const STATUS_TONES: Record<AgentTranscriptCallStatus, { label: string; variant: XdsBadgeVariant }> = {
  running: { label: 'Thinking…', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
  failed: { label: 'Failed', variant: 'danger' }
}

/** Past this length a prompt/response starts collapsed behind a toggle. */
const COLLAPSE_THRESHOLD = 700

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

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.lg}px;
`

const CallSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${spacing.sm}px;
`

const CallHeader = styled.header`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${spacing.sm}px;
`

const StageName = styled.span`
  color: ${colors.onSurfaceStrong};
  font-size: ${typography.sizes.sm}px;
  font-weight: ${typography.weights.bold};
`

const AgentName = styled.span`
  color: ${colors.onSurfaceVariant};
  font-size: ${typography.sizes.xs}px;
`

const HeaderMeta = styled.span`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: ${spacing.sm}px;
  color: ${colors.outline};
  font-family: monospace;
  font-size: 0.625rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`

const MessageRow = styled.div<{ $side: 'prompt' | 'response' }>`
  display: grid;
  gap: 0.3rem;
  justify-items: ${({ $side }) => ($side === 'prompt' ? 'end' : 'start')};
`

const RoleLabel = styled.span`
  color: ${colors.outline};
  font-family: monospace;
  font-size: 0.625rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`

const Bubble = styled.div<{ $side: 'prompt' | 'response'; $failed?: boolean }>`
  max-width: 94%;
  padding: 0.75rem 1rem;
  border-radius: ${radii.lg}px;
  font-family: 'JetBrains Mono', monospace;
  font-size: ${typography.sizes.xs}px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;

  ${({ $side, $failed }) =>
    $side === 'prompt'
      ? `
        background: ${withAlpha(colors.primary, 0.16)};
        border: 1px solid ${withAlpha(colors.primary, 0.35)};
        color: ${colors.onSurfaceStrong};
        border-bottom-right-radius: ${radii.sm}px;
      `
      : $failed
        ? `
          background: ${withAlpha(colors.error, 0.1)};
          border: 1px solid ${withAlpha(colors.error, 0.35)};
          color: ${colors.errorSoft};
          border-bottom-left-radius: ${radii.sm}px;
        `
        : `
          background: ${withAlpha(colors.surfaceRaised, 0.85)};
          border: 1px solid ${withAlpha(colors.primarySoft, 0.14)};
          color: ${colors.onSurfaceMuted};
          border-bottom-left-radius: ${radii.sm}px;
        `}
`

const ToggleButton = styled.button`
  border: 0;
  padding: 0;
  background: transparent;
  color: ${colors.primarySoft};
  font-family: inherit;
  font-size: ${typography.sizes.xs}px;
  font-weight: ${typography.weights.semibold};
  cursor: pointer;

  &:hover {
    color: ${colors.onSurfaceStrong};
  }
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

const Empty = styled.div`
  padding: ${spacing.lg}px;
  border: 2px dashed ${withAlpha(colors.white, 0.08)};
  border-radius: ${radii.md}px;
  color: ${colors.onSurfaceVariant};
  text-align: center;
  font-size: ${typography.sizes.sm}px;
  line-height: 1.6;
`

const Divider = styled.hr`
  margin: 0;
  border: 0;
  border-top: 1px solid ${withAlpha(colors.white, 0.06)};
`

function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
}

/** A long text starts collapsed behind a show-more toggle; short text renders whole. */
const CollapsibleText: React.FC<{ text: string; expandLabel: string; collapseLabel: string }> = ({
  text,
  expandLabel,
  collapseLabel
}) => {
  const [expanded, setExpanded] = useState(false)
  if (text.length <= COLLAPSE_THRESHOLD) return <>{text}</>
  return (
    <>
      {expanded ? text : `${text.slice(0, COLLAPSE_THRESHOLD)}…`}
      {'\n'}
      <ToggleButton type="button" onClick={() => setExpanded((value) => !value)}>
        {expanded ? collapseLabel : expandLabel}
      </ToggleButton>
    </>
  )
}

/**
 * Chat-style transcript of the AI agent calls made while processing a pipeline
 * item — for each call, the exact prompt sent to the model (right bubble) and
 * the raw model response (left bubble), with stage/model/timing metadata. A
 * `running` call renders a typing indicator, so a polling caller gets a live
 * "the agent is thinking" view. Pure and presentational: data fetching and
 * polling belong to the caller.
 */
export const AgentTranscript: React.FC<AgentTranscriptProps> = ({
  calls,
  emptyMessage = 'No AI agent activity recorded yet. Agent calls appear here as pipeline stages run.'
}) => {
  if (calls.length === 0) {
    return <Empty>{emptyMessage}</Empty>
  }

  return (
    <Wrap>
      {calls.map((call, index) => {
        const tone = STATUS_TONES[call.status]
        return (
          <React.Fragment key={call.id}>
            {index > 0 ? <Divider /> : null}
            <CallSection aria-label={`${call.stageLabel} agent call`} data-testid="agent-call">
              <CallHeader>
                <StageName>{call.stageLabel}</StageName>
                <AgentName>{call.agentLabel}</AgentName>
                <Badge variant={tone.variant} dot={call.status === 'running'}>
                  {tone.label}
                </Badge>
                <HeaderMeta>
                  {call.model ? <span>{call.model}{call.promptVersion ? ` · ${call.promptVersion}` : ''}</span> : null}
                  {call.durationMs != null ? <span>{formatDuration(call.durationMs)}</span> : null}
                  {call.timestamp ? <span>{call.timestamp}</span> : null}
                </HeaderMeta>
              </CallHeader>

              <MessageRow $side="prompt">
                <RoleLabel>Prompt sent</RoleLabel>
                <Bubble $side="prompt" data-testid="agent-prompt">
                  <CollapsibleText text={call.prompt} expandLabel="Show full prompt" collapseLabel="Collapse prompt" />
                </Bubble>
              </MessageRow>

              <MessageRow $side="response">
                <RoleLabel>{call.status === 'failed' ? 'Call failed' : 'Model response'}</RoleLabel>
                {call.status === 'running' ? (
                  <TypingIndicator aria-label="Agent is thinking">
                    <TypingDot $delay={0} />
                    <TypingDot $delay={150} />
                    <TypingDot $delay={300} />
                  </TypingIndicator>
                ) : call.status === 'failed' ? (
                  <Bubble $side="response" $failed data-testid="agent-error">
                    {call.errorMessage || 'The agent call failed.'}
                  </Bubble>
                ) : (
                  <Bubble $side="response" data-testid="agent-response">
                    <CollapsibleText
                      text={call.response ?? ''}
                      expandLabel="Show full response"
                      collapseLabel="Collapse response"
                    />
                  </Bubble>
                )}
              </MessageRow>
            </CallSection>
          </React.Fragment>
        )
      })}
    </Wrap>
  )
}

export default AgentTranscript
