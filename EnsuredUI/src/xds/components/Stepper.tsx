import React from 'react'
import styled from 'styled-components'
import { colors } from '../colors'
import { spacing, typography } from '../tokens'

export type StepperStep = {
  index?: number
  label: string
  title: string
}

export type StepperProps = {
  steps: StepperStep[]
  activeIndex: number
}

export type XdsStepperProps = StepperProps

const List = styled.ol`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: ${spacing.lg}px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: ${typography.fontFamily};
`

const Item = styled.li<{ $state: 'active' | 'completed' | 'upcoming' }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${spacing.xs}px;
  min-width: 0;
  color: ${({ $state }) =>
    $state === 'active' ? colors.primary : colors.neutral[400]};
`

const Number = styled.span<{ $state: 'active' | 'completed' | 'upcoming' }>`
  font-size: ${typography.sizes.lg}px;
  font-weight: ${typography.weights.bold};
  line-height: 1;
  color: ${({ $state }) =>
    $state === 'active' ? colors.primary : colors.neutral[400]};
`

const Label = styled.span`
  font-size: ${typography.sizes.xs}px;
  font-weight: ${typography.weights.medium};
  letter-spacing: 0.04em;
  text-transform: uppercase;
`

const Title = styled.span<{ $state: 'active' | 'completed' | 'upcoming' }>`
  font-size: ${typography.sizes.sm}px;
  font-weight: ${typography.weights.semibold};
  color: ${({ $state }) =>
    $state === 'active' ? colors.primary : colors.neutral[500]};
`

const pad = (n: number): string => String(n).padStart(2, '0')

export const Stepper: React.FC<StepperProps> = ({ steps, activeIndex }) => {
  return (
    <List>
      {steps.map((step, i) => {
        const state: 'active' | 'completed' | 'upcoming' =
          i === activeIndex ? 'active' : i < activeIndex ? 'completed' : 'upcoming'
        const displayIndex = step.index ?? i + 1
        return (
          <Item
            key={`${step.label}-${i}`}
            $state={state}
            aria-current={state === 'active' ? 'step' : undefined}
          >
            <Number $state={state}>{pad(displayIndex)}</Number>
            <Label>{step.label}</Label>
            <Title $state={state}>{step.title}</Title>
          </Item>
        )
      })}
    </List>
  )
}

export default Stepper
