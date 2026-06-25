import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect, fn } from '@storybook/test'
import PostCard from './PostCard'

const meta: Meta<typeof PostCard> = {
  title: 'XDS/PostCard',
  component: PostCard,
  args: {
    authorName: 'Ada Lovelace',
    authorHeadline: 'Senior Underwriter — Specialty Lines',
    content: 'Excited to share that our specialty lines book grew 24% this quarter.\n\nBig thanks to the whole team!',
    createdAt: '2h ago',
    likeCount: 12,
    commentCount: 3,
    likedByViewer: false,
    onToggleLike: fn(),
    onToggleComments: fn(),
    onAuthorClick: fn(),
    onDelete: fn()
  }
}

export default meta

type Story = StoryObj<typeof PostCard>

export const Default: Story = {}

export const LikedByViewer: Story = {
  args: { likedByViewer: true, likeCount: 13 }
}

export const Deletable: Story = {
  args: { canDelete: true }
}

export const WithCommentThread: Story = {
  args: {
    children: (
      <div style={{ color: '#98a6bf', fontSize: 13 }}>
        Comment thread renders here…
      </div>
    )
  }
}

// Interaction test: like + comments + author click + delete all fire callbacks.
export const Interactions: Story = {
  args: { canDelete: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)

    const likeButton = canvas.getByRole('button', { name: /Like · 12/i })
    expect(likeButton).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(likeButton)
    expect(args.onToggleLike).toHaveBeenCalledTimes(1)

    await userEvent.click(canvas.getByRole('button', { name: /Comments · 3/i }))
    expect(args.onToggleComments).toHaveBeenCalledTimes(1)

    await userEvent.click(canvas.getByRole('button', { name: 'Ada Lovelace' }))
    expect(args.onAuthorClick).toHaveBeenCalledTimes(1)

    await userEvent.click(canvas.getByRole('button', { name: 'Delete post' }))
    expect(args.onDelete).toHaveBeenCalledTimes(1)
  }
}
