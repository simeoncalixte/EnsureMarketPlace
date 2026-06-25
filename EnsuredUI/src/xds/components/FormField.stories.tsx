import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import { FormField } from './FormField'

const meta: Meta<typeof FormField> = {
  title: 'XDS/Form/FormField',
  component: FormField,
  argTypes: {
    label: { control: 'text' },
    error: { control: 'text' },
    placeholder: { control: 'text' },
    type: { control: 'text' },
    disabled: { control: 'boolean' }
  }
}

export default meta
type Story = StoryObj<typeof FormField>

export const Default: Story = {
  args: {
    label: 'Legal Entity Name',
    placeholder: 'e.g. Sovereign Asset Management Ltd'
  }
}

export const WithValue: Story = {
  args: {
    label: 'Annual GWP (USD)',
    defaultValue: '50,000,000.00',
    inputMode: 'decimal'
  }
}

export const WithError: Story = {
  args: {
    label: 'Cluster URL',
    placeholder: 'Enter endpoint…',
    error: 'A valid endpoint is required'
  }
}

export const NoLabel: Story = {
  args: {
    placeholder: 'Unlabeled field'
  }
}

// Interaction test: label is associated with the input via htmlFor/id,
// and typing into the field updates the controlled value.
export const TypeInteraction: Story = {
  render: () => {
    const [value, setValue] = React.useState('')
    return (
      <FormField
        label="Virtual Host"
        placeholder="Type a value…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // getByLabelText only resolves if the <label htmlFor> matches the input id.
    const input = canvas.getByLabelText('Virtual Host') as HTMLInputElement
    await expect(input).toBeInTheDocument()

    // The label's htmlFor must equal the input's id.
    const label = canvasElement.querySelector('label') as HTMLLabelElement
    await expect(label.htmlFor).toBe(input.id)
    await expect(input.id).toBeTruthy()

    await userEvent.type(input, 'production')
    await expect(input.value).toBe('production')
  }
}

// Interaction test: error wires up aria-invalid and aria-describedby to the message.
export const ErrorAriaInteraction: Story = {
  args: {
    label: 'Port',
    error: 'Port must be a number',
    defaultValue: 'abc'
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText('Port') as HTMLInputElement

    await expect(input).toHaveAttribute('aria-invalid', 'true')
    const describedBy = input.getAttribute('aria-describedby')
    await expect(describedBy).toBeTruthy()

    const message = canvasElement.querySelector(`#${describedBy}`)
    await expect(message).toHaveTextContent('Port must be a number')
  }
}
