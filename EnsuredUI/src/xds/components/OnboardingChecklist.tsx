import React from 'react'
import styled from 'styled-components'
import { colors, withAlpha } from '../colors'
import { radii, spacing, typography } from '../tokens'
import ProgressBar from './ProgressBar'
import Card from './Card'
import Badge from './Badge'
import Button from './Button'
import Checkbox from './Checkbox'

/**
 * A single step in an onboarding checklist.
 * - `complete`: the user has finished this step (shows a success badge + checked box).
 * - `current`: the next actionable step (its action button is the primary CTA).
 * - `todo`: a future step (its action button is a quiet/secondary affordance).
 */
export type OnboardingStepStatus = 'complete' | 'current' | 'todo'

export type OnboardingStep = {
  id: string
  title: string
  description?: string
  status: OnboardingStepStatus
  actionLabel?: string
  onAction?: () => void
}

export type OnboardingChecklistProps = {
  title?: string
  subtitle?: string
  steps: OnboardingStep[]
  /** Optional dismiss affordance; the header X only renders when provided. */
  onDismiss?: () => void
  className?: string
}

const Root = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: ${spacing.md}px;
`

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${spacing.md}px;
`

const HeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.xs}px;
`

const Title = styled.h3`
  margin: 0;
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.lg}px;
  font-weight: ${typography.weights.semibold};
  color: ${colors.onSurfaceStrong};
`

const Subtitle = styled.p`
  margin: 0;
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.sm}px;
  color: ${colors.onSurfaceVariant};
`

const DismissButton = styled.button`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: ${radii.md}px;
  background: transparent;
  color: ${colors.onSurfaceVariant};
  font-size: ${typography.sizes.md}px;
  line-height: 1;
  cursor: pointer;

  &:hover {
    background: ${colors.surfaceContainerHigh};
    color: ${colors.onSurface};
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${withAlpha(colors.primary, 0.4)};
  }
`

const StepList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${spacing.sm}px;
`

const StepRow = styled.li`
  display: flex;
  align-items: center;
  gap: ${spacing.md}px;
`

const StepCard = styled(Card)<{ $current: boolean }>`
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  gap: ${spacing.md}px;
  padding: ${spacing.md}px;
  ${({ $current }) =>
    $current
      ? `box-shadow: 0 0 0 1px ${withAlpha(colors.primary, 0.45)};`
      : ''}
`

const StepBody = styled.div`
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: ${spacing.xs}px;
  min-width: 0;
`

const StepTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.sm}px;
`

const StepTitle = styled.span`
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.sm}px;
  font-weight: ${typography.weights.semibold};
  color: ${colors.onSurface};
`

const StepDescription = styled.span`
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.xs}px;
  color: ${colors.onSurfaceVariant};
`

const ActionSlot = styled.div`
  flex: 0 0 auto;
`

const statusBadge: Record<OnboardingStepStatus, { variant: 'success' | 'info' | 'neutral'; label: string }> = {
  complete: { variant: 'success', label: 'Done' },
  current: { variant: 'info', label: 'Next up' },
  todo: { variant: 'neutral', label: 'To do' },
}

/**
 * Pure, props-only onboarding checklist surface.
 *
 * Reuses xds primitives (Card, ProgressBar, Badge, Button, Checkbox) and design
 * tokens only. It performs NO data fetching, NO routing, and NO persistence —
 * everything is driven by the `steps` array and the `onAction`/`onDismiss`
 * callbacks supplied by the caller.
 */
export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({
  title = 'Finish setting up your account',
  subtitle,
  steps,
  onDismiss,
  className,
}) => {
  const total = steps.length
  const completed = steps.filter((s) => s.status === 'complete').length

  return (
    <Root variant="high" className={className}>
      <Header>
        <HeaderText>
          <Title>{title}</Title>
          {subtitle != null && <Subtitle>{subtitle}</Subtitle>}
        </HeaderText>
        {onDismiss && (
          <DismissButton type="button" aria-label="Dismiss onboarding checklist" onClick={onDismiss}>
            ×
          </DismissButton>
        )}
      </Header>

      <ProgressBar
        value={completed}
        max={total > 0 ? total : 1}
        tone="gain"
        label={`${completed} of ${total} complete`}
      />

      <StepList>
        {steps.map((step) => {
          const badge = statusBadge[step.status]
          const isComplete = step.status === 'complete'
          const isCurrent = step.status === 'current'
          return (
            <StepRow key={step.id}>
              <Checkbox
                checked={isComplete}
                readOnly
                aria-label={`${step.title} ${isComplete ? 'complete' : 'incomplete'}`}
              />
              <StepCard variant="low" $current={isCurrent}>
                <StepBody>
                  <StepTitleRow>
                    <StepTitle>{step.title}</StepTitle>
                    <Badge variant={badge.variant} dot={isCurrent}>
                      {badge.label}
                    </Badge>
                  </StepTitleRow>
                  {step.description != null && <StepDescription>{step.description}</StepDescription>}
                </StepBody>
                {step.actionLabel && step.onAction && !isComplete && (
                  <ActionSlot>
                    <Button
                      type="button"
                      size="sm"
                      variant={isCurrent ? 'primary' : 'outline'}
                      onClick={step.onAction}
                    >
                      {step.actionLabel}
                    </Button>
                  </ActionSlot>
                )}
              </StepCard>
            </StepRow>
          )
        })}
      </StepList>
    </Root>
  )
}

export default OnboardingChecklist
