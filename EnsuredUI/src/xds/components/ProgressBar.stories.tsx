import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import ProgressBar from './ProgressBar'

const meta: Meta<typeof ProgressBar> = {
  title: 'XDS/ProgressBar',
  component: ProgressBar,
  args: {
    value: 82.4
  }
}
export default meta

type Story = StoryObj<typeof ProgressBar>

export const Default: Story = {
  args: { value: 82.4 }
}

export const WithLabel: Story = {
  args: { value: 60, label: 'Allocation', tone: 'primary' }
}

export const Tones: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16, width: 320 }}>
      <ProgressBar value={70} tone="primary" label="primary" />
      <ProgressBar value={70} tone="tertiary" label="tertiary" />
      <ProgressBar value={70} tone="gain" label="gain" />
      <ProgressBar value={70} tone="neutral" label="neutral" />
      <ProgressBar value={70} tone="danger" label="danger" />
    </div>
  )
}

export const Small: Story = {
  args: { value: 45, size: 'sm', tone: 'tertiary' }
}

export const ValueAndMax: Story = {
  args: { value: 30, max: 60, label: '30 / 60' }
}

// Interaction test: drives progress with a button and asserts aria-valuenow updates.
export const Interactive: Story = {
  render: () => {
    const [value, setValue] = useState(20)
    return (
      <div style={{ width: 320 }}>
        <ProgressBar value={value} label="Loading" tone="primary" />
        <button type="button" onClick={() => setValue((v) => Math.min(100, v + 30))}>
          advance
        </button>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const bar = canvas.getByRole('progressbar')
    await expect(bar).toHaveAttribute('aria-valuenow', '20')

    const button = canvas.getByRole('button', { name: 'advance' })
    await userEvent.click(button)
    await expect(bar).toHaveAttribute('aria-valuenow', '50')

    await userEvent.click(button)
    await expect(bar).toHaveAttribute('aria-valuenow', '80')
  }
}
