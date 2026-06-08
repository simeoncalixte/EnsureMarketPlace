import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import Badge, { type XdsBadgeVariant } from './Badge'

const meta: Meta<typeof Badge> = {
  title: 'XDS/Badge',
  component: Badge,
  args: {
    variant: 'surface',
    dot: false,
    children: 'Badge'
  }
}

export default meta

type Story = StoryObj<typeof Badge>

const Row: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>
)

// Original (backward-compatible) variants.
export const Variants: Story = {
  render: () => (
    <Row>
      <Badge variant="primary">Bound</Badge>
      <Badge variant="surface">Pending</Badge>
      <Badge variant="secondary">Claim</Badge>
      <Badge variant="tertiary">Historical</Badge>
    </Row>
  )
}

// New additive semantic tones.
export const Tones: Story = {
  render: () => (
    <Row>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="danger">Danger</Badge>
      <Badge variant="info">Info</Badge>
      <Badge variant="neutral">Neutral</Badge>
    </Row>
  )
}

// Leading dot variant.
export const WithDot: Story = {
  render: () => (
    <Row>
      <Badge variant="success" dot>Active</Badge>
      <Badge variant="danger" dot>Failed</Badge>
      <Badge variant="info" dot>Syncing</Badge>
    </Row>
  )
}

// Interaction test: a controlled wrapper cycles tone + toggles the dot,
// and we assert the resulting DOM reflects the change.
const tones: XdsBadgeVariant[] = ['success', 'warning', 'danger', 'info', 'neutral']

const InteractiveBadge: React.FC = () => {
  const [index, setIndex] = useState(0)
  const [dot, setDot] = useState(false)
  const variant = tones[index]
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <span data-testid="badge-host">
        <Badge variant={variant} dot={dot}>
          {variant}
        </Badge>
      </span>
      <button type="button" onClick={() => setIndex((i) => (i + 1) % tones.length)}>
        Next tone
      </button>
      <button type="button" onClick={() => setDot((d) => !d)}>
        Toggle dot
      </button>
    </div>
  )
}

export const Interactive: Story = {
  render: () => <InteractiveBadge />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const host = canvas.getByTestId('badge-host')
    expect(host).toHaveTextContent(/success/i)

    // Cycle the tone forward.
    await userEvent.click(canvas.getByRole('button', { name: 'Next tone' }))
    expect(host).toHaveTextContent(/warning/i)

    // Toggle the leading dot on; an aria-hidden dot span should appear.
    expect(host.querySelector('[aria-hidden="true"]')).toBeNull()
    await userEvent.click(canvas.getByRole('button', { name: 'Toggle dot' }))
    expect(host.querySelector('[aria-hidden="true"]')).not.toBeNull()
  }
}
