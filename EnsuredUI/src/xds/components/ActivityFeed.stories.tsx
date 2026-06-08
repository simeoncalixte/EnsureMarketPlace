import type { Meta, StoryObj } from '@storybook/react'
import { within, expect } from '@storybook/test'
import { colors } from '../colors'
import { ActivityFeed } from './ActivityFeed'

const meta: Meta<typeof ActivityFeed> = {
  title: 'XDS/ActivityFeed',
  component: ActivityFeed
}

export default meta

type Story = StoryObj<typeof ActivityFeed>

const sampleItems = [
  {
    time: '12:04:21',
    tag: 'info',
    tagColor: colors.info,
    source: 'pipeline',
    message: 'Submission received from broker portal'
  },
  {
    time: '12:04:55',
    tag: 'ocr',
    tagColor: colors.brand[600],
    source: 'extractor',
    message: 'Document parsed: 14 pages, 3 attachments'
  },
  {
    time: '12:05:10',
    tag: 'warn',
    tagColor: colors.warning,
    source: 'validation',
    message: 'Missing TIV on schedule row 8'
  },
  {
    time: '12:05:42',
    tag: 'ok',
    tagColor: colors.success,
    message: 'Risk normalized and queued for underwriting'
  }
]

export const Live: Story = {
  args: {
    title: 'Activity',
    live: true,
    items: sampleItems
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // All item messages render
    await expect(canvas.getByText('Submission received from broker portal')).toBeInTheDocument()
    await expect(canvas.getByText('Document parsed: 14 pages, 3 attachments')).toBeInTheDocument()
    await expect(canvas.getByText('Missing TIV on schedule row 8')).toBeInTheDocument()
    await expect(canvas.getByText('Risk normalized and queued for underwriting')).toBeInTheDocument()

    // The list is present with the right role
    await expect(canvas.getByRole('list')).toBeInTheDocument()

    // The live dot is present when live
    await expect(canvas.getByTestId('activity-feed-live-dot')).toBeInTheDocument()
  }
}

export const Static: Story = {
  args: {
    title: 'Audit log',
    live: false,
    items: [
      { time: '09:00:00', source: 'auth', message: 'User signed in' },
      { time: '09:01:12', tag: 'admin', message: 'Updated capital allocation' },
      { time: '09:03:30', message: 'Exported report' }
    ]
  }
}

export const NoHeader: Story = {
  args: {
    items: sampleItems
  }
}
