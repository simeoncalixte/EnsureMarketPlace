import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import { MaskedSecretInput } from './MaskedSecretInput'

const meta: Meta<typeof MaskedSecretInput> = {
  title: 'XDS/MaskedSecretInput',
  component: MaskedSecretInput
}

export default meta

type Story = StoryObj<typeof MaskedSecretInput>

const ControlledMaskedSecretInput = (args: {
  readOnly?: boolean
  placeholder?: string
  id?: string
  initialValue?: string
}) => {
  const [value, setValue] = useState(args.initialValue ?? '')
  return (
    <div style={{ maxWidth: 320 }}>
      <MaskedSecretInput
        id={args.id ?? 'secret'}
        value={value}
        onChange={setValue}
        readOnly={args.readOnly}
        placeholder={args.placeholder}
      />
    </div>
  )
}

export const Default: Story = {
  render: () => <ControlledMaskedSecretInput placeholder="Enter secret" initialValue="hunter2" />
}

export const ReadOnly: Story = {
  render: () => (
    <ControlledMaskedSecretInput readOnly placeholder="Read only secret" initialValue="locked-key" />
  )
}

export const TogglesVisibility: Story = {
  render: () => <ControlledMaskedSecretInput id="secret-toggle" placeholder="Enter secret" initialValue="hunter2" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByPlaceholderText('Enter secret') as HTMLInputElement

    // Masked (password) by default
    await expect(input).toHaveAttribute('type', 'password')

    // Click "Show secret" -> becomes text
    const showButton = canvas.getByRole('button', { name: 'Show secret' })
    await userEvent.click(showButton)
    await expect(input).toHaveAttribute('type', 'text')

    // Click "Hide secret" -> back to password
    const hideButton = canvas.getByRole('button', { name: 'Hide secret' })
    await userEvent.click(hideButton)
    await expect(input).toHaveAttribute('type', 'password')
  }
}
