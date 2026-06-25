import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect, fn, waitFor } from '@storybook/test'
import CommentThread, { type XdsCommentItem } from './CommentThread'

const sampleComments: XdsCommentItem[] = [
  {
    id: 1,
    authorName: 'Ada Okafor',
    body: 'Loss runs look clean — only one open claim from 2023.',
    createdAt: '2026-06-10 09:14'
  },
  {
    id: 2,
    authorName: 'Marcus Lee',
    body: 'Agreed. Flagging the roof age for the property underwriter though.',
    createdAt: '2026-06-10 10:02'
  },
  {
    id: 3,
    authorName: 'Priya Nair',
    body: 'Roof was replaced in 2021 per the inspection report.',
    createdAt: '2026-06-11 08:45'
  }
]

const meta: Meta<typeof CommentThread> = {
  title: 'XDS/CommentThread',
  component: CommentThread,
  args: {
    comments: sampleComments,
    busy: false
  }
}

export default meta

type Story = StoryObj<typeof CommentThread>

export const Default: Story = {}

export const Empty: Story = {
  args: { comments: [] }
}

export const Busy: Story = {
  args: { busy: true }
}

export const AddComment: Story = {
  args: {
    comments: sampleComments,
    onAddComment: fn()
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)

    const input = canvas.getByPlaceholderText('Write a comment…')
    const button = canvas.getByRole('button', { name: 'Comment' })

    // Button disabled while the composer is empty.
    expect(button).toBeDisabled()

    await userEvent.type(input, 'Looks good to me')
    expect(button).toBeEnabled()

    await userEvent.click(button)

    expect(args.onAddComment).toHaveBeenCalledWith('Looks good to me')
    // Input clears after onAddComment resolves.
    await waitFor(() => expect(input).toHaveValue(''))
    expect(button).toBeDisabled()
  }
}
