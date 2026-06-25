import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect, waitFor } from '@storybook/test'
import RulesEngine from './RulesEngine'
import { withGovernanceApi } from './governanceStoryMocks'

const meta: Meta<typeof RulesEngine> = {
  title: 'Pages/Governance/Rules Engine',
  component: RulesEngine,
  parameters: { layout: 'fullscreen' },
  decorators: [withGovernanceApi],
}
export default meta

type Story = StoryObj<typeof RulesEngine>

/** Rule-set registry for the active definition. */
export const Registry: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('Coastal wind guard')).toBeInTheDocument()
  },
}

/** Creating a rule set opens the recursive condition builder, and a new
 *  condition can be added to the root group. */
export const BuildNestedConditions: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await canvas.findByText('Coastal wind guard')
    await userEvent.click(canvas.getByText('+ New Rule Set'))

    // Editor opens with the root group's connector + save control.
    await expect(await canvas.findByText('Save Rule Set')).toBeInTheDocument()
    await expect(canvas.getByText('Connector')).toBeInTheDocument()

    const before = canvas.getAllByRole('combobox').length
    await userEvent.click(canvas.getByText('+ Add condition'))
    await waitFor(() => {
      // A new leaf adds its operator <select>, so combobox count grows.
      expect(canvas.getAllByRole('combobox').length).toBeGreaterThan(before)
    })

    await userEvent.click(canvas.getByText('Save Rule Set'))
    // Editor stays open after save; return to the registry and confirm the new
    // set persisted alongside the seeded one.
    await userEvent.click(canvas.getByText('← Back to registry'))
    await waitFor(async () => {
      await expect(await canvas.findByText('New Rule Set')).toBeInTheDocument()
      await expect(canvas.getByText('Coastal wind guard')).toBeInTheDocument()
    })
  },
}
