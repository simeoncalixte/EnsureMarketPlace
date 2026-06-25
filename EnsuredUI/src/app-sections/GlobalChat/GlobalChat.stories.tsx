import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import GlobalChatProvider from './index'

const meta: Meta<typeof GlobalChatProvider> = {
  title: 'App Sections/GlobalChat',
  component: GlobalChatProvider,
  parameters: {
    layout: 'fullscreen'
  }
}

export default meta

type Story = StoryObj<typeof GlobalChatProvider>

/* Stand-in app content so the cinematic scrim has something to show through. */
const FakeApp: React.FC = () => (
  <div style={{ minHeight: '100vh', padding: 32, display: 'grid', gap: 16, alignContent: 'start' }}>
    <h1 style={{ margin: 0 }}>Marketplace</h1>
    {Array.from({ length: 8 }, (_, i) => (
      <div
        key={i}
        style={{
          height: 64,
          borderRadius: 12,
          background: 'rgba(75, 142, 255, 0.08)',
          border: '1px solid rgba(173, 198, 255, 0.12)'
        }}
      />
    ))}
  </div>
)

export const Default: Story = {
  render: () => (
    <GlobalChatProvider>
      <FakeApp />
    </GlobalChatProvider>
  )
}

export const CtaOpensCinematicChat: Story = {
  render: () => (
    <GlobalChatProvider>
      <FakeApp />
    </GlobalChatProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Closed by default — only the floating CTA is visible
    await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument()
    const cta = canvas.getByRole('button', { name: 'Open Ensured copilot chat' })

    // Clicking the CTA opens the cinematic takeover and hides the CTA
    await userEvent.click(cta)
    await expect(canvas.getByRole('dialog')).toBeInTheDocument()
    await expect(canvas.queryByRole('button', { name: 'Open Ensured copilot chat' })).not.toBeInTheDocument()

    // Sending a message echoes it and shows the not-yet-connected assistant reply
    const input = canvas.getByRole('textbox', { name: 'Chat message' })
    await userEvent.type(input, 'Hello copilot{enter}')
    await expect(canvas.getByTestId('chat-message-user')).toHaveTextContent('Hello copilot')
    await expect(canvas.getByTestId('chat-message-assistant')).toHaveTextContent('not connected yet')

    // Escape closes the overlay and restores the CTA
    await userEvent.keyboard('{Escape}')
    await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'Open Ensured copilot chat' })).toBeInTheDocument()
  }
}
