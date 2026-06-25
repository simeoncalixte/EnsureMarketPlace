import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { ThemeToggle } from './ThemeToggle'
import { ThemeProvider } from '../theme'
import { button, click, play, seePressed } from '../../test-helpers/play'

const meta: Meta<typeof ThemeToggle> = {
  title: 'XDS/ThemeToggle',
  component: ThemeToggle,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div style={{ padding: 24, display: 'flex', gap: 16 }}>
          <Story />
        </div>
      </ThemeProvider>
    )
  ]
}

export default meta
type Story = StoryObj<typeof ThemeToggle>

export const Default: Story = {}

export const IconOnly: Story = {
  args: { iconOnly: true }
}

// Starts dark (aria-pressed=false, "Switch to light theme"); clicking flips to
// light (aria-pressed=true, "Switch to dark theme").
export const TogglesToLight: Story = {
  play: play(
    click(button(/switch to light theme/i)),
    seePressed(/switch to dark theme/i)
  )
}
