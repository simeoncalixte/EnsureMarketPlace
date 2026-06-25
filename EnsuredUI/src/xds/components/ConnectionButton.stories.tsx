import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect, fn } from '@storybook/test'
import ConnectionButton from './ConnectionButton'

const meta: Meta<typeof ConnectionButton> = {
  title: 'XDS/ConnectionButton',
  component: ConnectionButton,
  args: {
    status: 'none',
    busy: false,
    onConnect: fn(),
    onAccept: fn(),
    onDecline: fn(),
    onRemove: fn()
  }
}

export default meta

type Story = StoryObj<typeof ConnectionButton>

const Row: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>
)

export const AllStates: Story = {
  render: () => (
    <Row>
      <ConnectionButton status="none" />
      <ConnectionButton status="pending_outgoing" />
      <ConnectionButton status="pending_incoming" />
      <ConnectionButton status="connected" />
      <ConnectionButton status="blocked" />
      <ConnectionButton status="self" />
    </Row>
  )
}

export const Busy: Story = {
  args: { status: 'pending_incoming', busy: true }
}

// Interaction test: clicking Connect fires the onConnect callback.
export const ConnectFlow: Story = {
  args: { status: 'none' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Connect' }))
    expect(args.onConnect).toHaveBeenCalledTimes(1)
  }
}

// Interaction test: incoming request shows Accept + Decline; Accept fires.
export const AcceptIncoming: Story = {
  args: { status: 'pending_incoming' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    expect(canvas.getByRole('button', { name: 'Decline' })).toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: 'Accept' }))
    expect(args.onAccept).toHaveBeenCalledTimes(1)
    expect(args.onDecline).not.toHaveBeenCalled()
  }
}

// Interaction test: connected button swaps to Remove on hover and fires onRemove.
export const RemoveOnHover: Story = {
  args: { status: 'connected' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', { name: /Connected/i })
    await userEvent.hover(button)
    expect(button).toHaveTextContent('Remove')
    await userEvent.click(button)
    expect(args.onRemove).toHaveBeenCalledTimes(1)
    await userEvent.unhover(button)
    expect(button).toHaveTextContent(/Connected/i)
  }
}
