import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import AvatarStack from './AvatarStack'

const meta: Meta<typeof AvatarStack> = {
  title: 'XDS/AvatarStack',
  component: AvatarStack
}

export default meta

type Story = StoryObj<typeof AvatarStack>

export const GradientInitials: Story = {
  args: {
    size: 40,
    avatars: [
      { initials: 'AB', gradient: 'linear-gradient(135deg, #f59e0b, #dc2626)' },
      { initials: 'CD', gradient: 'linear-gradient(135deg, #16a34a, #0891b2)' },
      { initials: 'EF', gradient: 'linear-gradient(135deg, #6366f1, #312e81)' }
    ]
  }
}

export const WithImages: Story = {
  args: {
    size: 40,
    avatars: [
      { src: 'https://i.pravatar.cc/80?img=1', initials: 'AB' },
      { src: 'https://i.pravatar.cc/80?img=2', initials: 'CD' },
      { initials: 'EF' }
    ]
  }
}

export const OverflowChip: Story = {
  args: {
    size: 40,
    max: 3,
    avatars: [
      { initials: 'AB' },
      { initials: 'CD' },
      { initials: 'EF' },
      { initials: 'GH' },
      { initials: 'IJ' },
      { initials: 'KL' }
    ]
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // 6 avatars, max 3 -> overflow of +3
    const chip = await canvas.findByText('+3')
    await expect(chip).toBeInTheDocument()
    // Hover the chip to exercise interaction; aria-label is present.
    await userEvent.hover(chip)
    await expect(canvas.getByLabelText('3 more')).toBeInTheDocument()
  }
}
