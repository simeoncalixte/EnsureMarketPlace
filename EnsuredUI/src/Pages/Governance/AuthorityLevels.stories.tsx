import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import AuthorityLevels from './AuthorityLevels'
import { withGovernanceApi } from './governanceStoryMocks'

const meta: Meta<typeof AuthorityLevels> = {
  title: 'Pages/Governance/Authority Levels',
  component: AuthorityLevels,
  parameters: { layout: 'fullscreen' },
  decorators: [withGovernanceApi],
}
export default meta

type Story = StoryObj<typeof AuthorityLevels>

/** Levels for the active definition load into the table. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('Underwriter L1')).toBeInTheDocument()
    await expect(canvas.getByText('Add Authority Level')).toBeInTheDocument()
  },
}

/** Deleting a level round-trips through the API and empties the table. */
export const DeleteLevel: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await canvas.findByText('Underwriter L1')
    await userEvent.click(canvas.getByText('Delete'))
    await expect(await canvas.findByText('No authority levels yet.', undefined, { timeout: 6000 })).toBeInTheDocument()
  },
}
