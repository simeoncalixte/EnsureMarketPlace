import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import Input from './Input'

const meta: Meta<typeof Input> = {
  title: 'XDS/Form/Input/Input',
  component: Input
}

export default meta

type Story = StoryObj<typeof Input>

const ControlledInput = (args: { placeholder?: string; initialValue?: string }) => {
  const [value, setValue] = useState(args.initialValue ?? '')
  return (
    <div style={{ maxWidth: 320 }}>
      <Input
        placeholder={args.placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  )
}

export const Default: Story = {
  render: () => <Input placeholder="Enter alphanumeric key..." />
}

export const Search: Story = {
  render: () => <Input placeholder="Global asset search..." />
}

export const TypesText: Story = {
  render: () => <ControlledInput placeholder="Type here..." />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByPlaceholderText('Type here...') as HTMLInputElement

    await expect(input).toHaveValue('')

    await userEvent.type(input, 'hello world')
    await expect(input).toHaveValue('hello world')
  }
}
