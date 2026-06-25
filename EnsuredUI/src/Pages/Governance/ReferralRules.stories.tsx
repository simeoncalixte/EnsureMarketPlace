import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import ReferralRules from './ReferralRules'
import { withGovernanceApi } from './governanceStoryMocks'

const meta: Meta<typeof ReferralRules> = {
  title: 'Pages/Governance/Referral Rules',
  component: ReferralRules,
  parameters: { layout: 'fullscreen' },
  decorators: [withGovernanceApi],
}
export default meta

type Story = StoryObj<typeof ReferralRules>

/** Seeded referral rule loads with its severity badge. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('Large line referral')).toBeInTheDocument()
    await expect(canvas.getByText('high')).toBeInTheDocument()
    await expect(canvas.getByText('Add Referral Rule')).toBeInTheDocument()
  },
}

/** Deleting a rule round-trips and empties the table. */
export const DeleteRule: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await canvas.findByText('Large line referral')
    await userEvent.click(canvas.getByText('Delete'))
    await expect(await canvas.findByText('No referral rules yet.', undefined, { timeout: 6000 })).toBeInTheDocument()
  },
}
