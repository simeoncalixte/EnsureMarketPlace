import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import SectionHeader from './SectionHeader'

const meta: Meta<typeof SectionHeader> = {
  title: 'XDS/SectionHeader',
  component: SectionHeader,
  args: {
    title: 'Section title',
    subtitle: 'A short supporting description for the section.'
  }
}

export default meta

type Story = StoryObj<typeof SectionHeader>

// Title only (minimal, backward-compatible usage seen across src/Pages).
export const TitleOnly: Story = {
  args: {
    title: 'Users',
    subtitle: undefined
  }
}

// Title + subtitle (common usage e.g. ClaimsDashboard).
export const WithSubtitle: Story = {
  args: {
    title: 'Claims',
    subtitle: 'Recent claim activity'
  }
}

// With a leading icon (emoji string node, as used in the Registration flow).
export const WithIcon: Story = {
  args: {
    icon: '🔐',
    title: 'Choose access method',
    subtitle: 'Select the way you want to finish the account step.'
  }
}

// With a material symbol icon node.
export const WithMaterialIcon: Story = {
  args: {
    icon: <span className="material-symbols-outlined">analytics</span>,
    title: 'Analytics Dashboard',
    subtitle: 'Portfolio performance at a glance.'
  }
}

// With a right-aligned action slot.
export const WithAction: Story = {
  args: {
    title: 'Organizations',
    subtitle: 'Manage the organizations in your tenant.',
    action: (
      <button type="button" className="material-symbols-outlined">
        Add
      </button>
    )
  }
}

// Interaction test: the action slot wires up a real handler, and we assert
// the click fires while also asserting the title renders as a heading.
const InteractiveSectionHeader: React.FC = () => {
  const [count, setCount] = useState(0)
  return (
    <div>
      <SectionHeader
        icon="📊"
        title="Reports"
        subtitle="Download and review reports."
        action={
          <button type="button" onClick={() => setCount((c) => c + 1)}>
            Export
          </button>
        }
      />
      <span data-testid="export-count">{count}</span>
    </div>
  )
}

export const Interactive: Story = {
  render: () => <InteractiveSectionHeader />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // The title renders as an accessible heading.
    const heading = canvas.getByRole('heading', { name: 'Reports' })
    expect(heading).toBeInTheDocument()

    // The action button click fires the handler.
    const count = canvas.getByTestId('export-count')
    expect(count).toHaveTextContent('0')
    await userEvent.click(canvas.getByRole('button', { name: 'Export' }))
    expect(count).toHaveTextContent('1')
  }
}
