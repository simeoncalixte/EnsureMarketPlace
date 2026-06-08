import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import Card from './Card'

const meta: Meta<typeof Card> = {
  title: 'XDS/Card',
  component: Card,
  args: {
    elevated: false,
    variant: 'surface',
    tone: 'none',
    interactive: false,
    children: 'Card content'
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['surface', 'elevated', 'outline', 'low', 'high']
    },
    tone: {
      control: 'select',
      options: ['none', 'success', 'warning', 'danger', 'info']
    }
  }
}

export default meta

type Story = StoryObj<typeof Card>

const Row: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>{children}</div>
)

// Default (backward-compatible) surface and the original `elevated` prop.
export const Basic: Story = {
  render: () => (
    <Row>
      <Card>
        <strong>Surface</strong>
        <p>Default base surface card.</p>
      </Card>
      <Card elevated>
        <strong>Elevated</strong>
        <p>Original `elevated` raised surface.</p>
      </Card>
    </Row>
  )
}

// Additive surface variants.
export const Variants: Story = {
  render: () => (
    <Row>
      <Card variant="surface">Surface</Card>
      <Card variant="elevated">Elevated</Card>
      <Card variant="outline">Outline</Card>
      <Card variant="low">Low</Card>
      <Card variant="high">High</Card>
    </Row>
  )
}

// Additive semantic accent borders.
export const Tones: Story = {
  render: () => (
    <Row>
      <Card tone="success">Success</Card>
      <Card tone="warning">Warning</Card>
      <Card tone="danger">Danger</Card>
      <Card tone="info">Info</Card>
    </Row>
  )
}

// Interactive (clickable) card. A controlled counter wrapper lets the play test
// observe that onClick fires for both pointer and keyboard activation.
const ClickableCard: React.FC = () => {
  const [count, setCount] = useState(0)
  return (
    <div>
      <Card interactive onClick={() => setCount((c) => c + 1)} aria-label="Clickable card">
        <strong>Clickable card</strong>
        <p>Activate with click, Enter or Space.</p>
      </Card>
      <p>
        Activations: <span data-testid="count">{count}</span>
      </p>
    </div>
  )
}

export const Interactive: Story = {
  render: () => <ClickableCard />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const card = canvas.getByRole('button', { name: 'Clickable card' })
    const count = canvas.getByTestId('count')

    // It is focusable and announced as a button.
    expect(card).toHaveAttribute('tabindex', '0')
    expect(count).toHaveTextContent('0')

    // Pointer activation fires onClick.
    await userEvent.click(card)
    expect(count).toHaveTextContent('1')

    // Keyboard activation (Enter) also fires onClick.
    card.focus()
    await userEvent.keyboard('{Enter}')
    expect(count).toHaveTextContent('2')
  }
}
