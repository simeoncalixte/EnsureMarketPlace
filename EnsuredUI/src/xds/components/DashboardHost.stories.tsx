import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import Button from './Button'
import { Root, Toolbar, Spacer, SourceTag, ScopeSwitch, ScopeButton, AddPanel, AddChip, Empty, PresetLabel, StatusText } from './DashboardHost'

const Demo: React.FC = () => (
  <Root>
    <Toolbar>
      <SourceTag>Your layout</SourceTag>
      <Spacer />
      <ScopeSwitch>
        <ScopeButton type="button" $active>
          My dashboard
        </ScopeButton>
        <ScopeButton type="button" $active={false}>
          Organization default
        </ScopeButton>
      </ScopeSwitch>
      <Button variant="outline" size="sm">Customize</Button>
    </Toolbar>

    <AddPanel>
      <AddChip type="button">+ Add widget</AddChip>
      <PresetLabel>Predefined metrics</PresetLabel>
    </AddPanel>

    <Empty>This dashboard has no widgets.</Empty>

    <div style={{ marginTop: 12 }}>
      <StatusText>All good</StatusText>
    </div>
  </Root>
)

const meta: Meta<typeof Demo> = {
  title: 'XDS/Dashboard/DashboardHost (styles) ',
  component: Demo,
}

export default meta
type Story = StoryObj<typeof Demo>

export const Default: Story = {
  render: () => <Demo />,
}
