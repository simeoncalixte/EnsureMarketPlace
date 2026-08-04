import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import CustomMetricWidget from './CustomMetricWidget';
import { play, seeText } from '../test-helpers/play';

// CustomMetricWidget evaluates a metric against the live API. With no definition
// it shows its configure-prompt placeholder — the state worth pinning here
// without a network. Its live KPI/chart/table rendering is covered by the
// dashboards route tests and end-to-end verification.
const meta: Meta<typeof CustomMetricWidget> = {
  title: 'Dashboards/CustomMetricWidget',
  component: CustomMetricWidget,
};
export default meta;

type Story = StoryObj<typeof CustomMetricWidget>;

/** No definition yet → a prompt to configure the metric. */
export const Unconfigured: Story = {
  render: () => (
    <div style={{ width: 320, height: 140 }}>
      <CustomMetricWidget definition={undefined} />
    </div>
  ),
  play: play(seeText(/configure this metric/i)),
};
