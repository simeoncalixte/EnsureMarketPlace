import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import CinematicChat from './CinematicChat'
import type { CinematicChatMessage } from './CinematicChat'
import { Button } from './Button'

const meta: Meta<typeof CinematicChat> = {
  title: 'XDS/CinematicChat',
  component: CinematicChat,
  parameters: {
    layout: 'fullscreen'
  }
}

export default meta

type Story = StoryObj<typeof CinematicChat>

const sampleMessages: CinematicChatMessage[] = [
  {
    id: 'm1',
    role: 'user',
    content: 'What is my current Florida wind exposure?',
    timestamp: '09:41'
  },
  {
    id: 'm2',
    role: 'assistant',
    content:
      'Your active Florida wind exposure totals $84.2M TIV across 312 locations. Tri-County concentration is 61%, which is approaching your 65% appetite ceiling.',
    timestamp: '09:41'
  },
  {
    id: 'm3',
    role: 'user',
    content: 'Which submissions in the queue would push me over that ceiling?',
    timestamp: '09:42'
  }
]

/* Backdrop standing in for the app so the see-through scrim effect is visible in the story. */
const FakeAppBackdrop: React.FC = () => (
  <div style={{ minHeight: '100vh', padding: 32, display: 'grid', gap: 16, alignContent: 'start' }}>
    <h1 style={{ margin: 0 }}>Portfolio Analytics</h1>
    {Array.from({ length: 6 }, (_, i) => (
      <div
        key={i}
        style={{
          height: 72,
          borderRadius: 12,
          background: 'rgba(75, 142, 255, 0.08)',
          border: '1px solid rgba(173, 198, 255, 0.12)'
        }}
      />
    ))}
  </div>
)

const StatefulChat: React.FC<{ initialMessages?: CinematicChatMessage[]; isResponding?: boolean }> = ({
  initialMessages = [],
  isResponding = false
}) => {
  const [open, setOpen] = useState(true)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<CinematicChatMessage[]>(initialMessages)

  const handleSend = (content: string) => {
    setMessages((current) => [...current, { id: `m${current.length + 1}`, role: 'user', content }])
    setDraft('')
  }

  return (
    <>
      <FakeAppBackdrop />
      <Button onClick={() => setOpen(true)}>Ask Copilot</Button>
      <CinematicChat
        open={open}
        messages={messages}
        draft={draft}
        isResponding={isResponding}
        suggestions={['Summarize my open submissions', 'Where am I over appetite?', 'Draft a declinature letter']}
        onClose={() => setOpen(false)}
        onDraftChange={setDraft}
        onSend={handleSend}
        onSuggestionSelect={setDraft}
      />
    </>
  )
}

export const EmptyConversation: Story = {
  render: () => <StatefulChat />
}

export const WithConversation: Story = {
  render: () => <StatefulChat initialMessages={sampleMessages} />
}

export const AssistantResponding: Story = {
  render: () => <StatefulChat initialMessages={sampleMessages} isResponding />
}

export const SendsAndCloses: Story = {
  render: () => <StatefulChat />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Overlay is open with the composer ready
    const dialog = canvas.getByRole('dialog')
    await expect(dialog).toBeInTheDocument()
    const input = canvas.getByRole('textbox', { name: 'Chat message' })

    // Send button is disabled until there is a non-empty draft
    const sendButton = canvas.getByRole('button', { name: 'Send message' })
    await expect(sendButton).toBeDisabled()

    // Typing and pressing Enter sends the draft as a user message
    await userEvent.type(input, 'Show my cat exposure{enter}')
    await expect(canvas.getByTestId('chat-message-user')).toHaveTextContent('Show my cat exposure')
    await expect(input).toHaveValue('')

    // Close button dismisses the overlay
    await userEvent.click(canvas.getByRole('button', { name: 'Close chat' }))
    await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument()

    // The CTA reopens it
    await userEvent.click(canvas.getByRole('button', { name: 'Ask Copilot' }))
    await expect(canvas.getByRole('dialog')).toBeInTheDocument()
  }
}

export const SuggestionFillsDraft: Story = {
  render: () => <StatefulChat />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: 'Where am I over appetite?' }))
    const input = canvas.getByRole('textbox', { name: 'Chat message' })
    await expect(input).toHaveValue('Where am I over appetite?')
  }
}
