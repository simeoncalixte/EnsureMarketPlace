import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import Select from './Select'

const meta: Meta<typeof Select> = {
  title: 'XDS/Select',
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
    const select = canvas.getByRole('combobox', { name: 'Tranche level' }) as HTMLSelectElement

    await expect(select.value).toBe('')

    await userEvent.selectOptions(select, 'Mezzanine Debt')

    await expect(select.value).toBe('mezz')
    await expect((canvas.getByRole('option', { name: 'Mezzanine Debt' }) as HTMLOptionElement).selected).toBe(true)
  }
}
