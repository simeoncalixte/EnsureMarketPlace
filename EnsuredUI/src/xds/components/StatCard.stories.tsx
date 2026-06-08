import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import StatCard from './StatCard'

const meta: Meta<typeof StatCard> = {
  title: 'XDS/StatCard',
  component: StatCard
}

export default meta

type Story = StoryObj<typeof StatCard>

export const Default: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 24 }}>
      <StatCard label="Total Allocated" value="$42.8M" delta="+12.4%" />
      <StatCard label="Risk Coefficient" value="0.042" delta="-0.002" />
    </div>
  )
}

export const WithAffixesAndNote: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 24 }}>
      <StatCard
        label="Total Portfolio"
        currencyPrefix="$"
        value="42.8"
        suffix="M"
        delta="+12.4%"
        note="Above target"
        tone="success"
      />
      <StatCard
        label="Loss Ratio"
        value="68.2"
        suffix="%"
        note="Trending up"
        tone="danger"
      />
      <StatCard
        label="Open Claims"
        value="312"
        note="Custom color note"
        noteColor="#a5b4fc"
      />
    </div>
  )
}

export const ToneVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
      <StatCard label="Default" value="100" note="default tone" />
      <StatCard label="Success" value="100" note="success tone" tone="success" />
      <StatCard label="Danger" value="100" note="danger tone" tone="danger" />
      <StatCard label="Warning" value="100" note="warning tone" tone="warning" />
      <StatCard label="Info" value="100" note="info tone" tone="info" />
      <StatCard label="Muted" value="100" note="muted tone" tone="muted" />
    </div>
  )
}

/**
 * Interaction test: a story-local stateful wrapper updates the suffix and note
 * when a button is clicked, and we assert the StatCard re-renders the new values.
 */
export const Interaction: Story = {
  render: () => {
    const Wrapper = () => {
      const [open, setOpen] = useState(false)
      return (
        <div>
          <button type="button" onClick={() => setOpen((v) => !v)}>
            toggle
          </button>
          <StatCard
            label="Bound Premium"
            currencyPrefix="$"
            value={open ? '12.5' : '0.0'}
            suffix="M"
            note={open ? 'Live' : 'Pending'}
            tone={open ? 'success' : 'muted'}
          />
        </div>
      )
    }
    return <Wrapper />
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Initial state.
    expect(canvas.getByText('Pending')).toBeInTheDocument()
    expect(canvas.getByText('0.0')).toBeInTheDocument()
    // Toggle.
    await userEvent.click(canvas.getByRole('button', { name: 'toggle' }))
    // Updated state.
    expect(canvas.getByText('Live')).toBeInTheDocument()
    expect(canvas.getByText('12.5')).toBeInTheDocument()
    // Affixes present.
    expect(canvas.getByText('$')).toBeInTheDocument()
    expect(canvas.getByText('M')).toBeInTheDocument()
  }
}
