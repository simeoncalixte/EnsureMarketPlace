import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, fireEvent, expect } from '@storybook/test'
import Simulation from './Simulation'
import { withGovernanceApi } from './governanceStoryMocks'

const meta: Meta<typeof Simulation> = {
  title: 'Pages/Governance/Simulation',
  component: Simulation,
  parameters: { layout: 'fullscreen' },
  decorators: [withGovernanceApi],
}
export default meta

type Story = StoryObj<typeof Simulation>

/** Empty simulation list with the run form present. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('Run Simulation')).toBeInTheDocument()
    await expect(canvas.getByText('No simulations yet.')).toBeInTheDocument()
  },
}

/** Running a simulation posts inputs and lands a result row with the computed
 *  utilization (exposure 1M / capacity 4M = 25%). */
export const RunSimulation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Wait for auth + the page to settle (the page shows a guard until useAuthMe
    // resolves the org), then confirm the list starts empty.
    await canvas.findByText('Run Simulation')
    await expect(canvas.getByText('No simulations yet.')).toBeInTheDocument()

    // Set exposure/capacity so the mock computes a non-zero utilization, then run.
    // fireEvent.change drives the controlled number inputs reliably.
    fireEvent.change(canvas.getByLabelText('Exposure'), { target: { value: '1000000' } })
    fireEvent.change(canvas.getByLabelText('Capacity'), { target: { value: '4000000' } })
    await userEvent.click(canvas.getByRole('button', { name: 'Run Simulation' }))

    // The posted sim lands in the list (1M / 4M = 25% utilization, within appetite).
    await expect(await canvas.findByText('completed', undefined, { timeout: 4000 })).toBeInTheDocument()
    await expect(canvas.getByText('25%')).toBeInTheDocument()
  },
}
