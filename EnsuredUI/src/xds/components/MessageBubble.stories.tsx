import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect, fn } from '@storybook/test'
import MessageBubble from './MessageBubble'

const meta: Meta<typeof MessageBubble> = {
  title: 'XDS/MessageBubble',
  component: MessageBubble,
  args: {
    mine: false,
    kind: 'text',
    body: 'Hi — can you take a look at the new submission?',
    senderName: 'Ada Okafor',
    createdAt: '09:14'
  }
}

export default meta

type Story = StoryObj<typeof MessageBubble>

const Column: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 520 }}>{children}</div>
)

export const Variants: Story = {
  render: () => (
    <Column>
      <MessageBubble
        mine={false}
        kind="text"
        senderName="Ada Okafor"
        body="Hi — can you take a look at the new submission?"
        createdAt="09:14"
      />
      <MessageBubble
        mine
        kind="text"
        body="On it. Reviewing the loss runs now."
        createdAt="09:16"
      />
      <MessageBubble
        mine={false}
        kind="text"
        senderName="Marcus Lee"
        body="Forwarding the broker's note."
        createdAt="09:20"
        externalProvider="whatsapp"
      />
      <MessageBubble
        mine
        kind="text"
        body="Got it, thanks."
        createdAt="09:21"
        externalProvider="telegram"
      />
    </Column>
  )
}

export const SubmissionShare: Story = {
  args: {
    mine: false,
    kind: 'submission_share',
    senderName: 'Ada Okafor',
    submissionLabel: 'Submission #42',
    body: 'This one needs a second pair of eyes.',
    createdAt: '10:02',
    onOpenSubmission: fn()
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    expect(canvas.getByText('Submission #42')).toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: 'View submission' }))
    expect(args.onOpenSubmission).toHaveBeenCalledTimes(1)
  }
}

export const Attachment: Story = {
  args: {
    mine: true,
    kind: 'attachment',
    attachmentName: 'loss-runs-2025.pdf',
    attachmentUrl: 'https://example.com/loss-runs-2025.pdf',
    body: 'Here are the loss runs.',
    createdAt: '11:30'
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const link = canvas.getByRole('link', { name: 'loss-runs-2025.pdf' })
    expect(link).toHaveAttribute('href', 'https://example.com/loss-runs-2025.pdf')
    expect(link).toHaveAttribute('target', '_blank')
  }
}
