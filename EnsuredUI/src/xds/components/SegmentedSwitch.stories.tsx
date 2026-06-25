import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import SegmentedSwitch, { SegmentedSwitchOption } from './SegmentedSwitch'

const meta: Meta<typeof SegmentedSwitch> = {
  title: 'XDS/Form/SegmentedSwitch',
  component: SegmentedSwitch
}

export default meta

type Story = StoryObj<typeof SegmentedSwitch>

/**
 * Legacy string[] + numeric index API (backward compatible).
 */
export const LegacyStringOptions: Story = {
  render: () => {
    const [i, setI] = useState(0)
    return (
      <SegmentedSwitch
        aria-label="Data range"
        options={['Real-time', 'Historical', 'Projected']}
        value={i}
        onChange={setI}
      />
    )
  }
}

/**
 * Enhanced { label, value }[] + string value API.
 */
export const ObjectOptions: Story = {
  render: () => {
    const options: SegmentedSwitchOption[] = [
      { label: 'Table', value: 'table' },
      { label: 'Kanban', value: 'kanban' }
    ]
    const [value, setValue] = useState('table')
    return (
      <SegmentedSwitch
        aria-label="View mode"
        options={options}
        value={value}
        onChange={setValue}
      />
    )
  }
}

/**
 * Interaction test: clicking a segment selects it and updates aria-pressed.
 */
export const Interaction: Story = {
  render: () => {
    const options: SegmentedSwitchOption[] = [
      { label: 'Builder View', value: 'builder' },
      { label: 'Rendered View', value: 'rendered' }
    ]
    const [value, setValue] = useState('builder')
    return (
      <SegmentedSwitch
        aria-label="Editor mode"
        options={options}
        value={value}
        onChange={setValue}
      />
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const group = canvas.getByRole('group', { name: 'Editor mode' })
    expect(group).toBeInTheDocument()

    const builder = canvas.getByRole('button', { name: 'Builder View' })
    const rendered = canvas.getByRole('button', { name: 'Rendered View' })

    // Initial state: first option active.
    expect(builder).toHaveAttribute('aria-pressed', 'true')
    expect(rendered).toHaveAttribute('aria-pressed', 'false')

    // Click the second option.
    await userEvent.click(rendered)

    expect(rendered).toHaveAttribute('aria-pressed', 'true')
    expect(builder).toHaveAttribute('aria-pressed', 'false')
  }
}
