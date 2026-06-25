import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import NumberInput, { type NumberInputProps } from './NumberInput'

const meta: Meta<typeof NumberInput> = {
  title: 'XDS/Form/Input/NumberInput',
  component: NumberInput
}

export default meta

type Story = StoryObj<typeof NumberInput>

// Controlled wrapper so interactions are observable in the story.
const Controlled: React.FC<NumberInputProps> = ({ value: initialValue = '', onChange, ...rest }) => {
  const [value, setValue] = useState<string>(String(initialValue))
  return (
    <NumberInput
      aria-label="number"
      value={value}
      onChange={(event) => {
        setValue(event.target.value)
        onChange?.(event)
      }}
      {...rest}
    />
  )
}

export const Default: Story = {
  render: (args) => <Controlled {...args} />,
  args: {
    placeholder: 'Enter a number'
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole('spinbutton') as HTMLInputElement

    await expect(input).toBeInTheDocument()
    await expect(input).toHaveAttribute('type', 'number')

    await userEvent.clear(input)
    await userEvent.type(input, '42')
    await expect(input).toHaveValue(42)
  }
}

export const WithMinMaxStep: Story = {
  render: (args) => <Controlled {...args} />,
  args: {
    placeholder: 'Step by 5',
    min: 0,
    max: 100,
    step: 5,
    value: '10'
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole('spinbutton') as HTMLInputElement

    // min/max/step are forwarded to the underlying input.
    await expect(input).toHaveAttribute('min', '0')
    await expect(input).toHaveAttribute('max', '100')
    await expect(input).toHaveAttribute('step', '5')

    // Typing a new value updates the controlled state.
    await userEvent.clear(input)
    await userEvent.type(input, '75')
    await expect(input).toHaveValue(75)
  }
}

export const Disabled: Story = {
  render: (args) => <Controlled {...args} />,
  args: {
    value: '7',
    disabled: true
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole('spinbutton') as HTMLInputElement
    await expect(input).toBeDisabled()
  }
}
