import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import Textarea from './Textarea'

const meta: Meta<typeof Textarea> = {
  title: 'XDS/Textarea',
  component: Textarea
}

export default meta

type Story = StoryObj<typeof Textarea>

export const Default: Story = {
  args: {
    placeholder: 'Describe the risk exposure...',
    rows: 4
  }
}

export const Disabled: Story = {
  args: {
    placeholder: 'Read only field',
    value: 'This textarea is disabled.',
    disabled: true,
    rows: 3
  }
}

const ControlledTextarea: React.FC = () => {
  const [value, setValue] = useState('')
  return (
    <Textarea
      placeholder="Type your notes here..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
      rows={5}
    />
  )
}

export const Controlled: Story = {
  render: () => <ControlledTextarea />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const textarea = canvas.getByPlaceholderText('Type your notes here...') as HTMLTextAreaElement
    await userEvent.type(textarea, 'Hello world')
    await expect(textarea).toHaveValue('Hello world')
  }
}
