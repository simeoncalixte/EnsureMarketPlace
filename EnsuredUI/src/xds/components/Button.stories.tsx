import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'XDS/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'outline', 'text']
    },
    tone: {
      control: 'select',
      options: ['default', 'success', 'warning', 'danger']
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md']
    }
  }
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary'
  }
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary'
  }
}

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost'
  }
}

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline'
  }
}

export const TextVariant: Story = {
  args: {
    variant: 'text',
    children: 'Text'
  }
}

export const Tones: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8 }}>
      <Button variant="primary" tone="success">
        Success
      </Button>
      <Button variant="primary" tone="warning">
        Warning
      </Button>
      <Button variant="primary" tone="danger">
        Danger
      </Button>
      <Button variant="outline" tone="danger">
        Danger Outline
      </Button>
    </div>
  )
}

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
    </div>
  )
}

// Interaction test: clicking the button fires its handler and toggles label.
export const ClickInteraction: Story = {
  render: () => {
    const [count, setCount] = React.useState(0)
    return (
      <Button variant="primary" onClick={() => setCount((c) => c + 1)}>
        {count === 0 ? 'Click me' : `Clicked ${count}`}
      </Button>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', { name: 'Click me' })
    await userEvent.click(button)
    await expect(canvas.getByRole('button', { name: 'Clicked 1' })).toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: 'Clicked 1' }))
    await expect(canvas.getByRole('button', { name: 'Clicked 2' })).toBeInTheDocument()
  }
}
