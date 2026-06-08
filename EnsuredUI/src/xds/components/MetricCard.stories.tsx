import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import MetricCard, { type MetricCardTrend } from './MetricCard'

const meta: Meta<typeof MetricCard> = {
  title: 'XDS/MetricCard',
  component: MetricCard,
  args: {
    label: 'Total Capital Locked',
    value: '$1.28B',
    delta: '+14.2% YoY'
  }
}

export default meta

type Story = StoryObj<typeof MetricCard>

const Grid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
      gap: 16,
      maxWidth: 760
    }}
  >
    {children}
  </div>
)

// Backward-compatible usage matching existing LandingPage callers.
export const Basic: Story = {
  render: () => (
    <Grid>
      <MetricCard label="Total Capital Locked" value="$1.28B" delta="+14.2% YoY" />
      <MetricCard label="Active Deals" value="142" delta="Verified Tranches" />
      <MetricCard label="Avg. Returns" value="12.4%" delta="NET APY" />
    </Grid>
  )
}

// Additive enhancements: trend, icon, accentColor, tone, projectedValue.
export const WithTrendAndIcon: Story = {
  render: () => (
    <Grid>
      <MetricCard
        label="Loss Ratio"
        value="61.2%"
        delta="-2.4 pts vs prior"
        trend="down"
        tone="success"
        icon="trending_down"
      />
      <MetricCard
        label="Premium Written"
        value="$84.1M"
        projectedValue="$90.0M target"
        delta="+5.9% MTD"
        trend="up"
        icon="payments"
      />
      <MetricCard
        label="Open Submissions"
        value="37"
        delta="No change"
        trend="flat"
        icon="inbox"
      />
      <MetricCard
        label="At-Risk Capital"
        value="$12.6M"
        delta="Above threshold"
        tone="danger"
        accentColor="#ff6b6b"
        icon="warning"
      />
    </Grid>
  )
}

const trends: MetricCardTrend[] = ['up', 'down', 'flat']

const InteractiveMetric: React.FC = () => {
  const [index, setIndex] = useState(0)
  const trend = trends[index]
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <div data-testid="metric-host" style={{ width: 240 }}>
        <MetricCard
          label="Combined Ratio"
          value="98.7%"
          delta={`trend: ${trend}`}
          trend={trend}
          icon="monitoring"
        />
      </div>
      <button type="button" onClick={() => setIndex((i) => (i + 1) % trends.length)}>
        Next trend
      </button>
    </div>
  )
}

export const Interactive: Story = {
  render: () => <InteractiveMetric />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const host = canvas.getByTestId('metric-host')
    // Starts on the "up" trend.
    expect(host).toHaveTextContent(/trend: up/i)
    expect(host.querySelector('.material-symbols-outlined')).not.toBeNull()
    expect(host.textContent).toContain('trending_up')

    // Cycle to the "down" trend.
    await userEvent.click(canvas.getByRole('button', { name: 'Next trend' }))
    expect(host).toHaveTextContent(/trend: down/i)
    expect(host.textContent).toContain('trending_down')

    // Cycle to the "flat" trend.
    await userEvent.click(canvas.getByRole('button', { name: 'Next trend' }))
    expect(host).toHaveTextContent(/trend: flat/i)
    expect(host.textContent).toContain('trending_flat')
  }
}
