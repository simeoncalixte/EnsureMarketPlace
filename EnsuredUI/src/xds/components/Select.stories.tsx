import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import Select from './Select'

const meta: Meta<typeof Select> = {
  title: 'XDS/Form/Select/Select',
  component: Select
}

export default meta

type Story = StoryObj<typeof Select>

export const Default: Story = {
  render: () => (
    <Select defaultValue="">
      <option value="">Select Tranche Level</option>
      <option value="junior">Junior Equity</option>
      <option value="mezz">Mezzanine Debt</option>
      <option value="senior">Senior Secure</option>
    </Select>
  )
}

export const Disabled: Story = {
  render: () => (
    <Select defaultValue="senior" disabled>
      <option value="junior">Junior Equity</option>
      <option value="senior">Senior Secure</option>
    </Select>
  )
}

const ControlledSelect = () => {
  const [value, setValue] = useState('')
  return (
    <Select aria-label="Tranche level" value={value} onChange={(e) => setValue(e.target.value)}>
      <option value="">Select Tranche Level</option>
      <option value="junior">Junior Equity</option>
      <option value="mezz">Mezzanine Debt</option>
      <option value="senior">Senior Secure</option>
    </Select>
  )
}

export const SelectsAnOption: Story = {
  render: () => <ControlledSelect />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole('button', { name: 'Tranche level' })

    // Opens the custom dropdown panel (no native browser option list).
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    // Choosing an option fills the trigger and marks it selected.
    await userEvent.click(canvas.getByRole('option', { name: 'Mezzanine Debt' }))
    await expect(trigger).toHaveTextContent('Mezzanine Debt')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  }
}
