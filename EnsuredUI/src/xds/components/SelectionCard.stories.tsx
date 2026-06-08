import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import SelectionCard from './SelectionCard'
import { colors } from '../colors'

const meta: Meta<typeof SelectionCard> = {
  title: 'XDS/SelectionCard',
  component: SelectionCard,
  args: {
    title: 'Institutional',
    subtitle: 'High Density Access',
    footerLabel: 'Requires LEI Verification',
    ctaText: 'Configure Entity'
  }
}

export default meta

type Story = StoryObj<typeof SelectionCard>

const Grid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 760 }}>{children}</div>
)

const Icon: React.FC<{ name: string }> = ({ name }) => (
  <span className="material-symbols-outlined">{name}</span>
)

// Backward-compatible default look used by RoleSelection / InvestmentType callers.
export const Default: Story = {
  render: (args) => (
    <Grid>
      <SelectionCard {...args} icon={<Icon name="account_balance" />} accentColor={colors.primary}>
        <p style={{ color: colors.onSurfaceVariant }}>
          For entities, sovereign wealth funds, and corporate treasuries requiring programmatic capital allocation.
        </p>
      </SelectionCard>
      <SelectionCard
        title="Retail Accredited"
        subtitle="Verified Individual"
        icon={<Icon name="person" />}
        accentColor={colors.secondary}
        footerLabel="Accreditation Auto-Check"
        ctaText="Proceed as Individual"
      >
        <p style={{ color: colors.onSurfaceVariant }}>
          For professional individual investors seeking institutional-grade reinsurance yield.
        </p>
      </SelectionCard>
    </Grid>
  )
}

// Active + disabled states (active styling is additive; disabled is a new prop).
export const States: Story = {
  render: () => (
    <Grid>
      <SelectionCard
        title="Active"
        subtitle="Selected"
        icon={<Icon name="check_circle" />}
        accentColor={colors.primary}
        active
        footerLabel="Currently selected"
        ctaText="Continue"
      >
        <p style={{ color: colors.onSurfaceVariant }}>This card is in its active state.</p>
      </SelectionCard>
      <SelectionCard
        title="Disabled"
        subtitle="Unavailable"
        icon={<Icon name="block" />}
        accentColor={colors.secondary}
        disabled
        footerLabel="Not available"
        ctaText="Locked"
      >
        <p style={{ color: colors.onSurfaceVariant }}>This card cannot be selected.</p>
      </SelectionCard>
    </Grid>
  )
}

// Interaction test: controlled selection via onSelect, plus disabled no-op.
const InteractiveCards: React.FC = () => {
  const [selected, setSelected] = useState<string>('')
  const [clicks, setClicks] = useState(0)
  return (
    <div>
      <Grid>
        <SelectionCard
          selectionId="institutional"
          title="Institutional"
          subtitle="High Density Access"
          icon={<Icon name="account_balance" />}
          accentColor={colors.primary}
          active={selected === 'institutional'}
          onSelect={setSelected}
          footerLabel="Requires LEI Verification"
          ctaText="Configure Entity"
          data-testid="card-institutional"
        >
          <p style={{ color: colors.onSurfaceVariant }}>Programmatic capital allocation.</p>
        </SelectionCard>
        <SelectionCard
          title="Locked"
          subtitle="Unavailable"
          icon={<Icon name="block" />}
          disabled
          onClick={() => setClicks((c) => c + 1)}
          footerLabel="Not available"
          ctaText="Locked"
          data-testid="card-locked"
        >
          <p style={{ color: colors.onSurfaceVariant }}>Disabled card.</p>
        </SelectionCard>
      </Grid>
      <div data-testid="selected-value" style={{ marginTop: 12 }}>
        selected: {selected || 'none'} / disabledClicks: {clicks}
      </div>
    </div>
  )
}

export const Interactive: Story = {
  render: () => <InteractiveCards />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const card = canvas.getByTestId('card-institutional')
    const status = canvas.getByTestId('selected-value')
    expect(status).toHaveTextContent('selected: none')
    expect(card).toHaveAttribute('aria-pressed', 'false')

    // Clicking selects the card.
    await userEvent.click(card)
    expect(status).toHaveTextContent('selected: institutional')
    expect(card).toHaveAttribute('aria-pressed', 'true')

    // Disabled card does not fire onClick.
    const locked = canvas.getByTestId('card-locked')
    expect(locked).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(locked)
    expect(status).toHaveTextContent('disabledClicks: 0')
  }
}
