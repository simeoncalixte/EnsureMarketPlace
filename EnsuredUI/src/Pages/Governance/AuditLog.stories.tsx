import type { Meta, StoryObj } from '@storybook/react'
import { within, expect } from '@storybook/test'
import AuditLog from './AuditLog'
import { withGovernanceApi } from './governanceStoryMocks'

const meta: Meta<typeof AuditLog> = {
  title: 'Pages/Governance/Audit Log',
  component: AuditLog,
  parameters: { layout: 'fullscreen' },
  decorators: [withGovernanceApi],
}
export default meta

type Story = StoryObj<typeof AuditLog>

/** Read-only audit trail renders the seeded entry with its action badge,
 *  resolved definition name, and the definition filter. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('created')).toBeInTheDocument()
    await expect(canvas.getByText('Primary Capacity')).toBeInTheDocument()
    await expect(canvas.getByText('All definitions')).toBeInTheDocument()
  },
}
