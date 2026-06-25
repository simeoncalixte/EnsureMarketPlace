import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect, fn } from '@storybook/test'
import IntegrationCard from './IntegrationCard'
import Input from './Input'

const meta: Meta<typeof IntegrationCard> = {
  title: 'XDS/IntegrationCard',
  component: IntegrationCard,
  args: {
    provider: 'whatsapp',
    verified: false,
    busy: false
  }
}

export default meta

type Story = StoryObj<typeof IntegrationCard>

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 420 }}>
      <IntegrationCard
        provider="whatsapp"
        verified={false}
        onConnect={fn()}
        connectFields={<Input placeholder="Phone number" />}
      />
      <IntegrationCard
        provider="whatsapp"
        verified={false}
        verificationCode="ENS-4921"
        onDisconnect={fn()}
      />
      <IntegrationCard
        provider="whatsapp"
        verified
        displayName="+1 ••• ••• 4821"
        onDisconnect={fn()}
      />
      <IntegrationCard
        provider="telegram"
        verified
        simulated
        displayName="@ensured_bot"
        onDisconnect={fn()}
      />
      <IntegrationCard provider="telegram" verified={false} busy onConnect={fn()} />
    </div>
  )
}

export const AwaitingVerification: Story = {
  args: {
    provider: 'telegram',
    verified: false,
    verificationCode: 'TG-7305',
    onDisconnect: fn()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    expect(canvas.getByText('Awaiting verification')).toBeInTheDocument()
    expect(canvas.getByText('TG-7305')).toBeInTheDocument()
    expect(
      canvas.getByText('Send this code to the bot/number to finish connecting.')
    ).toBeInTheDocument()
    // A pending code shows Disconnect, not Connect.
    expect(canvas.queryByRole('button', { name: 'Connect' })).toBeNull()
    expect(canvas.getByRole('button', { name: 'Disconnect' })).toBeEnabled()
  }
}

export const ConnectFlow: Story = {
  args: {
    provider: 'whatsapp',
    verified: false,
    onConnect: fn(),
    connectFields: <Input placeholder="Phone number" />
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    expect(canvas.getByText('Not connected')).toBeInTheDocument()
    expect(canvas.getByPlaceholderText('Phone number')).toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: 'Connect' }))
    expect(args.onConnect).toHaveBeenCalledTimes(1)
  }
}

export const DisconnectFlow: Story = {
  args: {
    provider: 'telegram',
    verified: true,
    displayName: '@ensured_bot',
    onDisconnect: fn()
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    expect(canvas.getByText('Connected')).toBeInTheDocument()
    expect(canvas.getByText('@ensured_bot')).toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: 'Disconnect' }))
    expect(args.onDisconnect).toHaveBeenCalledTimes(1)
  }
}
