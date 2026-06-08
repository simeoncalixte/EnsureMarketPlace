import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import ConfidenceBadge, { type ConfidenceLabel } from './ConfidenceBadge'

const meta: Meta<typeof ConfidenceBadge> = {
  title: 'XDS/ConfidenceBadge',
  component: ConfidenceBadge,
  args: {
    confidenceLabel: 'credible'
  }
}

export default meta

type Story = StoryObj<typeof ConfidenceBadge>

const Row: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>
)

// All three credibility states.
export const States: Story = {
  render: () => (
    <Row>
      <ConfidenceBadge confidenceLabel="credible" title="NAIC / III aggregate" />
      <ConfidenceBadge confidenceLabel="developing" title="Blended prior + emerging loss data" />
      <ConfidenceBadge confidenceLabel="benchmark_low" title="NAIC / III aggregate benchmark only" />
    </Row>
  )
}

// Null / legacy rows render nothing — proving additive, non-degrading behavior.
export const NullRendersNothing: Story = {
  render: () => (
    <div data-testid="null-host">
      <ConfidenceBadge confidenceLabel={null} />
      <ConfidenceBadge confidenceLabel={undefined} />
      <ConfidenceBadge confidenceLabel={'mystery' as ConfidenceLabel} />
    </div>
  )
}

// Interaction test: cycle through labels (incl. null) and assert the rendered
// label/variant, and that null/unknown renders nothing.
const labels: Array<ConfidenceLabel | null> = ['credible', 'developing', 'benchmark_low', null]
const expectedText: Record<string, RegExp | null> = {
  credible: /credible/i,
  developing: /developing/i,
  benchmark_low: /benchmark/i,
  null: null
}

const InteractiveConfidence: React.FC = () => {
  const [index, setIndex] = useState(0)
  const label = labels[index]
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <span data-testid="confidence-host">
        <ConfidenceBadge confidenceLabel={label} title="prior source citation" />
      </span>
      <button type="button" onClick={() => setIndex((i) => (i + 1) % labels.length)}>
        Next label
      </button>
    </div>
  )
}

export const Interactive: Story = {
  render: () => <InteractiveConfidence />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const host = canvas.getByTestId('confidence-host')

    // 'credible' -> success badge labelled "Credible".
    expect(host).toHaveTextContent(/credible/i)
    const credibleBadge = host.querySelector('span')
    expect(credibleBadge).not.toBeNull()

    // 'developing' -> "Developing".
    await userEvent.click(canvas.getByRole('button', { name: 'Next label' }))
    expect(host).toHaveTextContent(/developing/i)

    // 'benchmark_low' -> "Benchmark".
    await userEvent.click(canvas.getByRole('button', { name: 'Next label' }))
    expect(host).toHaveTextContent(/benchmark/i)

    // null -> renders nothing inside the host.
    await userEvent.click(canvas.getByRole('button', { name: 'Next label' }))
    expect(host).toBeEmptyDOMElement()
  }
}
