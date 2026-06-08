import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import React, { useState } from 'react'
import { Stepper, type StepperStep } from './Stepper'

const steps: StepperStep[] = [
  { label: 'Account', title: 'Create account' },
  { label: 'Profile', title: 'Set up profile' },
  { label: 'Billing', title: 'Add payment method' },
  { label: 'Review', title: 'Confirm and submit' }
]

const meta: Meta<typeof Stepper> = {
  title: 'XDS/Stepper',
  component: Stepper,
  args: {
    steps,
    activeIndex: 1
  }
}

export default meta

type Story = StoryObj<typeof Stepper>

export const Default: Story = {}

export const FirstStepActive: Story = {
  args: {
    activeIndex: 0
  }
}

export const LastStepActive: Story = {
  args: {
    activeIndex: steps.length - 1
  }
}

export const Interactive: Story = {
  render: (args) => {
    const [activeIndex, setActiveIndex] = useState(0)
    return (
      <div>
        <Stepper {...args} activeIndex={activeIndex} />
        <button
          type="button"
          onClick={() => setActiveIndex((i) => Math.min(i + 1, steps.length - 1))}
        >
          Next
        </button>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Initially the first step is active.
    const firstActive = canvas.getByText('Create account').closest('li')
    expect(firstActive).toHaveAttribute('aria-current', 'step')

    // Advance to the next step.
    await userEvent.click(canvas.getByRole('button', { name: 'Next' }))

    const secondActive = canvas.getByText('Set up profile').closest('li')
    expect(secondActive).toHaveAttribute('aria-current', 'step')

    // The active step shows the correct title and previous step is no longer current.
    expect(firstActive).not.toHaveAttribute('aria-current')
    expect(secondActive).toHaveTextContent('Set up profile')
  }
}
