import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect, waitFor } from '@storybook/test'
import CapacityDefinitions from './CapacityDefinitions'
import { withGovernanceApi } from './governanceStoryMocks'

const meta: Meta<typeof CapacityDefinitions> = {
  title: 'Pages/Governance/Capacity Definitions',
  component: CapacityDefinitions,
  parameters: { layout: 'fullscreen' },
  decorators: [withGovernanceApi],
}
export default meta

type Story = StoryObj<typeof CapacityDefinitions>

/** Registry renders the seeded definitions. */
export const Registry: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('Primary Capacity')).toBeInTheDocument()
    await expect(canvas.getByText('Specialty Cyber Pilot')).toBeInTheDocument()
    // Active flag + status badge from the seed.
    await expect(canvas.getAllByText('active').length).toBeGreaterThan(0)
  },
}

/** Opening a definition reveals the section-tabbed editor; the Pricing tab
 *  renders fields backed by the pricingControls JSONB block. */
export const EditAndSwitchSection: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await canvas.findByText('Primary Capacity')
    await userEvent.click(canvas.getAllByText('Edit')[0])

    await expect(await canvas.findByText(/Edit ·/)).toBeInTheDocument()
    // Section tabs are present.
    await userEvent.click(canvas.getByText('Pricing'))
    await expect(await canvas.findByText('Minimum Price ($)')).toBeInTheDocument()
    await userEvent.click(canvas.getByText('Workflow'))
    await expect(await canvas.findByText('Allow Auto Bind')).toBeInTheDocument()
  },
}

/** Creating a definition opens the new draft straight into the editor. */
export const CreateOpensEditor: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await canvas.findByText('Primary Capacity')
    await userEvent.click(canvas.getByText('+ New Definition'))
    await waitFor(async () => {
      await expect(await canvas.findByText('Edit · New Capacity')).toBeInTheDocument()
    })
  },
}
