import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import Checkbox from './Checkbox'

const meta: Meta<typeof Checkbox> = {
  title: 'XDS/Form/Checkbox',
  component: Checkbox,
  argTypes: {
    label: { control: 'text' },
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' }
  }
}

export default meta
type Story = StoryObj<typeof Checkbox>

export const Default: Story = {
  args: {
    label: 'Accept terms'
  }
}

export const Checked: Story = {
  args: {
    label: 'Subscribed',
    defaultChecked: true
  }
}

export const WithoutLabel: Story = {
  args: {}
}

export const Disabled: Story = {
  args: {
    label: 'Unavailable option',
    disabled: true,
    defaultChecked: true
  }
}

// Interaction test: toggling the checkbox flips its checked state on and off.
export const ToggleInteraction: Story = {
  render: () => {
    const [checked, setChecked] = React.useState(false)
    return (
      <Checkbox
        label="Toggle me"
        checked={checked}
        onChange={(e) => setChecked((e.target as HTMLInputElement).checked)}
      />
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const checkbox = canvas.getByRole('checkbox') as HTMLInputElement

    // Starts unchecked.
    await expect(checkbox).not.toBeChecked()

    // Click via the label text drives the controlled state to checked.
    await userEvent.click(canvas.getByText('Toggle me'))
    await expect(checkbox).toBeChecked()

    // Clicking again toggles it back off.
    await userEvent.click(checkbox)
    await expect(checkbox).not.toBeChecked()
  }
}
