import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, expect } from '@storybook/test'
import Avatar from './Avatar'

const meta: Meta<typeof Avatar> = {
  title: 'XDS/Avatar',
  component: Avatar,
  args: {
    name: 'Ada Lovelace',
    size: 'md'
  }
}

export default meta

type Story = StoryObj<typeof Avatar>

const Row: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>
)

export const Sizes: Story = {
  render: () => (
    <Row>
      <Avatar name="Ada Lovelace" size="sm" />
      <Avatar name="Ada Lovelace" size="md" />
      <Avatar name="Ada Lovelace" size="lg" />
    </Row>
  )
}

export const DeterministicHues: Story = {
  render: () => (
    <Row>
      <Avatar name="Ada Lovelace" />
      <Avatar name="Grace Hopper" />
      <Avatar name="Alan Turing" />
      <Avatar name="Katherine Johnson" />
      <Avatar name="Edsger Dijkstra" />
      <Avatar name="Barbara Liskov" />
    </Row>
  )
}

export const WithImage: Story = {
  args: {
    name: 'Ada Lovelace',
    src: 'https://placehold.co/64x64/png',
    size: 'lg'
  }
}

// Interaction test: initials fallback renders the first letters of the first
// two words, and the element is exposed as an accessible image.
export const Initials: Story = {
  args: { name: 'Ada Lovelace', src: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const avatar = canvas.getByRole('img', { name: 'Ada Lovelace' })
    expect(avatar).toHaveTextContent('AL')
  }
}
