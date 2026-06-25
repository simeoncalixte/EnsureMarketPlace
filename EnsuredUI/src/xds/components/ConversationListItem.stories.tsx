import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect, fn } from '@storybook/test'
import ConversationListItem from './ConversationListItem'

const meta: Meta<typeof ConversationListItem> = {
  title: 'XDS/ConversationListItem',
  component: ConversationListItem,
  args: {
    name: 'Ada Okafor',
    lastMessagePreview: 'Can you take a look at the new submission?',
    lastMessageAt: '09:14',
    unreadCount: 0,
    active: false,
    onClick: fn()
  }
}

export default meta

type Story = StoryObj<typeof ConversationListItem>

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 360 }}>
      <ConversationListItem
        name="Ada Okafor"
        lastMessagePreview="Can you take a look at the new submission?"
        lastMessageAt="09:14"
        onClick={fn()}
      />
      <ConversationListItem
        name="Marcus Lee"
        lastMessagePreview="Forwarding the broker's note with a very long preview that should ellipsize"
        lastMessageAt="Yesterday"
        unreadCount={3}
        onClick={fn()}
      />
      <ConversationListItem
        name="Priya Nair"
        lastMessagePreview="Roof was replaced in 2021 per the inspection report."
        lastMessageAt="Mon"
        active
        onClick={fn()}
      />
      <ConversationListItem name="Broker Desk" onClick={fn()} />
    </div>
  )
}

export const Unread: Story = {
  args: { unreadCount: 5 }
}

export const Active: Story = {
  args: { active: true }
}

export const ClickRow: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const row = canvas.getByRole('button')
    await userEvent.click(row)
    expect(args.onClick).toHaveBeenCalledTimes(1)
  }
}
