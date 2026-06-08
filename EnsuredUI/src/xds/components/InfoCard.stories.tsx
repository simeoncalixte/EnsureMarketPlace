import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { within, userEvent, expect } from '@storybook/test'
import InfoCard from './InfoCard'

const meta: Meta<typeof InfoCard> = {
  title: 'XDS/InfoCard',
  component: InfoCard,
  args: {
    title: 'Global TVL Index',
    value: '$1.24B'
  }
}

export default meta

type Story = StoryObj<typeof InfoCard>

/** Original metric card — backward compatible primary tone. */
export const PrimaryMetric: Story = {
  args: {
    title: 'Global TVL Index',
    value: '$1.24B',
    tone: 'primary'
  }
}

/** Original metric card — backward compatible secondary tone. */
export const SecondaryMetric: Story = {
  args: {
    title: 'Active Claims Pool',
    value: '312',
    tone: 'secondary'
  }
}

/** All tinted callout tones with icons and free-form children. */
export const CalloutTones: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16, maxWidth: 420 }}>
      <InfoCard tone="info" icon="info" title="Heads up">
        Submission will be reviewed within one business day.
      </InfoCard>
      <InfoCard tone="success" icon="check_circle" title="Verified">
        Your KYC documents passed automated checks.
      </InfoCard>
      <InfoCard tone="warning" icon="warning" title="Action needed">
        Capital buffer is approaching the minimum threshold.
      </InfoCard>
      <InfoCard tone="danger" icon="error" title="Limit breached" value="142%">
        Aggregate exposure exceeds the configured cap.
      </InfoCard>
    </div>
  )
}

/** Free-form children only, no title/value. */
export const ChildrenOnly: Story = {
  render: () => (
    <InfoCard tone="info">
      This callout uses only free-form children with no title or value.
    </InfoCard>
  )
}

/**
 * Interaction test: a stateful wrapper toggles the tone between info and danger.
 * Asserts the rendered callout content and role update accordingly.
 */
export const ToggleTone: Story = {
  render: () => {
    const Wrapper = () => {
      const [danger, setDanger] = useState(false)
      return (
        <div style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
          <button type="button" onClick={() => setDanger((d) => !d)}>
            Toggle tone
          </button>
          <InfoCard
            tone={danger ? 'danger' : 'info'}
            icon={danger ? 'error' : 'info'}
            title={danger ? 'Limit breached' : 'All clear'}
          >
            {danger ? 'Exposure exceeds the cap.' : 'Everything is within limits.'}
          </InfoCard>
        </div>
      )
    }
    return <Wrapper />
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Initial state: info tone.
    await expect(canvas.getByText('All clear')).toBeInTheDocument()
    await expect(canvas.getByText('Everything is within limits.')).toBeInTheDocument()
    await expect(canvas.getByRole('note')).toBeInTheDocument()

    // Toggle to danger tone.
    await userEvent.click(canvas.getByRole('button', { name: 'Toggle tone' }))

    await expect(canvas.getByText('Limit breached')).toBeInTheDocument()
    await expect(canvas.getByText('Exposure exceeds the cap.')).toBeInTheDocument()
    await expect(canvas.queryByText('All clear')).not.toBeInTheDocument()
  }
}
