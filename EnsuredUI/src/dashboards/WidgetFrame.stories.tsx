import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import WidgetFrame from './WidgetFrame';
import { button, click, play, seeText } from '../test-helpers/play';

const meta: Meta<typeof WidgetFrame> = {
  title: 'Dashboards/WidgetFrame',
  component: WidgetFrame,
};
export default meta;

type Story = StoryObj<typeof WidgetFrame>;

/** Read-only chrome: title header + body, no remove control. */
export const ViewMode: Story = {
  render: () => (
    <div style={{ width: 360, height: 200 }}>
      <WidgetFrame title="Loss Ratio Trend" editing={false}>
        <div>Chart goes here</div>
      </WidgetFrame>
    </div>
  ),
  play: play(seeText('Loss Ratio Trend'), seeText('Chart goes here')),
};

/** Edit mode exposes a remove control; clicking it fires onRemove. */
export const Editing: Story = {
  render: () => {
    const [removed, setRemoved] = useState(false);
    return (
      <div style={{ width: 360, height: 200 }}>
        {removed ? (
          <div>Removed</div>
        ) : (
          <WidgetFrame title="Capital Exposure" editing onRemove={() => setRemoved(true)}>
            <div>Body</div>
          </WidgetFrame>
        )}
      </div>
    );
  },
  play: play(click(button(/remove capital exposure/i)), seeText('Removed')),
};

/** The header carries the drag-handle class only while editing. */
export const DragHandlePresence: Story = {
  render: () => (
    <div style={{ width: 360, height: 200 }}>
      <WidgetFrame title="Solvency" editing>
        <div>Body</div>
      </WidgetFrame>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const title = canvas.getByText('Solvency');
    // The header (title's parent) is the react-grid-layout drag handle in edit mode.
    expect(title.parentElement).toHaveClass('widget-drag-handle');
  },
};
