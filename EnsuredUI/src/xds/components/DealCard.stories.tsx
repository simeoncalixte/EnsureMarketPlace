import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import DealCard from './DealCard'

const meta: Meta<typeof DealCard> = {
  title: 'XDS/DealCard',
  component: DealCard,
  args: {
    title: 'Gulf Coast Windstorm 24-B',
    subtitle: 'TX-FL | CAT 4+ THRESHOLD',
    yieldText: '14.2% APY',
    capacity: '$45.0M / $50M',
    riskLevel: 2
  }
}

export default meta

type Story = StoryObj<typeof DealCard>

// Default single card mirroring LandingPage usage.
export const Default: Story = {}

// A list of cards at varying risk levels.
export const RiskLevels: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12 }}>
      <DealCard
        title="Gulf Coast Windstorm 24-B"
        subtitle="TX-FL | CAT 4+ THRESHOLD"
        yieldText="14.2% APY"
        capacity="$45.0M / $50M"
        riskLevel={2}
      />
      <DealCard
        title="Pacific Basin Seismic"
        subtitle="RING OF FIRE | 7.2 MW"
        yieldText="9.8% APY"
        capacity="$120.0M / $200M"
        riskLevel={1}
      />
      <DealCard
        title="EU Precipitation Hedge"
        subtitle="WESTERN EUROPE | INDEXED"
        yieldText="11.5% APY"
        capacity="$12.4M / $15M"
        riskLevel={3}
      />
    </div>
  )
}

// Renders core fields and asserts they appear in the DOM.
export const FieldsRender: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    expect(canvas.getByText('Gulf Coast Windstorm 24-B')).toBeInTheDocument()
    expect(canvas.getByText('TX-FL | CAT 4+ THRESHOLD')).toBeInTheDocument()
    expect(canvas.getByText('14.2% APY')).toBeInTheDocument()
    expect(canvas.getByText('$45.0M / $50M')).toBeInTheDocument()
    expect(canvas.getByRole('button', { name: 'INVEST NOW' })).toBeInTheDocument()
  }
}

// Interaction test: clicking INVEST NOW fires onInvest; a controlled
// wrapper records the click count so the effect is observable in the DOM.
const InteractiveDealCard: React.FC = () => {
  const [count, setCount] = useState(0)
  return (
    <div>
      <span data-testid="invest-count">{count}</span>
      <DealCard
        title="Gulf Coast Windstorm 24-B"
        subtitle="TX-FL | CAT 4+ THRESHOLD"
        yieldText="14.2% APY"
        capacity="$45.0M / $50M"
        riskLevel={2}
        onInvest={() => setCount((c) => c + 1)}
      />
    </div>
  )
}

export const Invests: Story = {
  render: () => <InteractiveDealCard />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const count = canvas.getByTestId('invest-count')
    expect(count).toHaveTextContent('0')

    await userEvent.click(canvas.getByRole('button', { name: 'INVEST NOW' }))
    expect(count).toHaveTextContent('1')

    await userEvent.click(canvas.getByRole('button', { name: 'INVEST NOW' }))
    expect(count).toHaveTextContent('2')
  }
}
