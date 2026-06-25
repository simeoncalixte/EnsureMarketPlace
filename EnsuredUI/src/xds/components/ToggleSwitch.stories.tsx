import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import { ToggleSwitch } from './ToggleSwitch'

const meta: Meta<typeof ToggleSwitch> = {
  title: 'XDS/Form/ToggleSwitch',
  component: ToggleSwitch
}

export default meta

type Story = StoryObj<typeof ToggleSwitch>

const Controlled: React.FC<{
  initial?: boolean
  label?: React.ReactNode
  disabled?: boolean
  id?: string
}> = ({ initial = false, label, disabled, id }) => {
  const [checked, setChecked] = useState(initial)
  return (
    <ToggleSwitch
      checked={checked}
      onChange={setChecked}
      label={label}
      disabled={disabled}
      id={id}
    />
  )
}

export const Off: Story = {
  render: () => <Controlled initial={false} label="Notifications" />
}

export const On: Story = {
  render: () => <Controlled initial label="Notifications" />
}

export const Disabled: Story = {
  render: () => <Controlled initial label="Locked setting" disabled />
}

export const TogglesOnClick: Story = {
  render: () => <Controlled initial={false} label="Enable feature" id="feature-toggle" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const sw = canvas.getByRole('switch')

    expect(sw).toHaveAttribute('aria-checked', 'false')

    await userEvent.click(sw)
    expect(sw).toHaveAttribute('aria-checked', 'true')

    await userEvent.click(sw)
    expect(sw).toHaveAttribute('aria-checked', 'false')
  }
}
