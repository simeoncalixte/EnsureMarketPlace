import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect, fn } from '@storybook/test'
import OnboardingChecklist, { type OnboardingStep } from './OnboardingChecklist'

const meta: Meta<typeof OnboardingChecklist> = {
  title: 'XDS/OnboardingChecklist',
  component: OnboardingChecklist,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div style={{ background: '#071129', padding: 24, maxWidth: 720 }}>
        <Story />
      </div>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof OnboardingChecklist>

const freshSteps: OnboardingStep[] = [
  {
    id: 'appetite',
    title: 'Define your appetite',
    description: 'Set capital, lines of business, and preferred perils.',
    status: 'current',
    actionLabel: 'Define appetite',
  },
  {
    id: 'channels',
    title: 'Connect an ingestion channel',
    description: 'Wire up a feed so submissions flow in automatically.',
    status: 'todo',
    actionLabel: 'Connect channel',
  },
  {
    id: 'submissions',
    title: 'See your first priced submission',
    description: 'Review a submission once your pipeline produces one.',
    status: 'todo',
    actionLabel: 'Open pipeline',
  },
]

const partialSteps: OnboardingStep[] = [
  { ...freshSteps[0], status: 'complete' },
  { ...freshSteps[1], status: 'current' },
  { ...freshSteps[2], status: 'todo' },
]

const completeSteps: OnboardingStep[] = freshSteps.map((s) => ({ ...s, status: 'complete' as const }))

export const Fresh: Story = {
  args: { steps: freshSteps, subtitle: 'Three quick steps to start underwriting.' },
}

export const Partial: Story = {
  args: { steps: partialSteps, subtitle: 'You are partway there.' },
}

export const Complete: Story = {
  args: { steps: completeSteps, subtitle: 'All set!' },
}

export const Interactive: Story = {
  args: {
    // Attach a spy to the current step's action and a dismiss spy so the play
    // test can assert callbacks fired.
    steps: partialSteps.map((s) => (s.status === 'current' ? { ...s, onAction: fn() } : s)),
    subtitle: 'Interactive: drives the spies below.',
    onDismiss: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    // Progress reflects completed steps: 1 of 3 complete.
    const bar = canvas.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', String(Math.round((1 / 3) * 100)))
    expect(canvas.getByText('1 of 3 complete')).toBeInTheDocument()

    // Clicking the current step's action fires its onAction spy.
    const actionSpy = (args.steps[1] as OnboardingStep).onAction as ReturnType<typeof fn>
    await userEvent.click(canvas.getByRole('button', { name: /connect channel/i }))
    expect(actionSpy).toHaveBeenCalled()

    // Clicking dismiss fires onDismiss.
    await userEvent.click(canvas.getByRole('button', { name: /dismiss onboarding checklist/i }))
    expect(args.onDismiss).toHaveBeenCalled()
  },
}
