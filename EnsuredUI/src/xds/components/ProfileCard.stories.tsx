import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect, fn } from '@storybook/test'
import ProfileCard from './ProfileCard'
import ConnectionButton from './ConnectionButton'

const meta: Meta<typeof ProfileCard> = {
  title: 'XDS/ProfileCard',
  component: ProfileCard,
  args: {
    name: 'Ada Lovelace',
    headline: 'Senior Underwriter — Specialty Lines',
    organizationName: 'Ensured Mutual',
    role: 'Underwriter',
    connectionCount: 128
  }
}

export default meta

type Story = StoryObj<typeof ProfileCard>

export const Default: Story = {}

export const Minimal: Story = {
  args: {
    name: 'Grace Hopper',
    headline: null,
    organizationName: null,
    role: null,
    connectionCount: null
  }
}

export const WithAction: Story = {
  args: {
    action: <ConnectionButton status="none" onConnect={() => {}} />
  }
}

// Interaction test: a clickable card exposes role=button and fires onClick.
export const Clickable: Story = {
  args: {
    onClick: fn()
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const card = canvas.getByRole('button', { name: /Ada Lovelace/i })
    expect(card).toHaveTextContent('128 connections')
    await userEvent.click(card)
    expect(args.onClick).toHaveBeenCalledTimes(1)
  }
}
