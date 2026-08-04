import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import WidgetFrame from '../../dashboards/WidgetFrame'

const meta: Meta<typeof WidgetFrame> = {
  title: 'XDS/Dashboard/WidgetFrame',
  component: WidgetFrame
}

export default meta

type Story = StoryObj<typeof WidgetFrame>

export const Default: Story = {
  render: () => (
    <div style={{ width: 360, height: 160 }}>
      <WidgetFrame title="Sample Widget" editing={false}>{
        <div>Widget body content</div>
      }</WidgetFrame>
    </div>
  )
}

export const Editing: Story = {
  render: () => (
    <div style={{ width: 360, height: 160 }}>
      <WidgetFrame
        title="Editable Widget"
        editing={true}
        configurable
        onConfigure={() => alert('configure')}
        onRemove={() => alert('remove')}
      >
        <div>Widget body content</div>
      </WidgetFrame>
    </div>
  )
}
