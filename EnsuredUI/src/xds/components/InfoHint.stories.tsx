import type { Meta, StoryObj } from '@storybook/react'
import InfoHint from './InfoHint'
import { play, click, seeText, notSeeText, button } from '../../test-helpers/play'

const meta: Meta<typeof InfoHint> = {
  title: 'XDS/InfoHint',
  component: InfoHint,
  argTypes: {
    text: { control: 'text' },
    label: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof InfoHint>

export const Default: Story = {
  args: {
    text: 'Maximum exposure the carrier will accept on any single risk under this capacity.',
  },
}

export const WithLabel: Story = {
  render: () => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 12 }}>Max Line Size</span>
      <InfoHint text="The largest share of a single risk this capacity will write." />
    </span>
  ),
}

// Interaction test: tooltip text is hidden until the trigger is activated.
export const RevealsOnActivate: Story = {
  args: {
    text: 'Target loss ratio used to gauge pricing adequacy for risks in this capacity.',
  },
  play: play(
    notSeeText(/target loss ratio used to gauge/i),
    click(button(/more information/i)),
    seeText(/target loss ratio used to gauge/i),
  ),
}
