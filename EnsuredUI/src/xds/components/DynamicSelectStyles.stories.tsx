import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Wrap, Grow, ManageBtn, Note } from './DynamicSelectStyles'
import Select from './Select'

const Demo: React.FC = () => (
  <div style={{ maxWidth: 420 }}>
    <Wrap>
      <Grow>
        <Select>
          <option value="">—</option>
        </Select>
      </Grow>
      <ManageBtn type="button">Manage</ManageBtn>
    </Wrap>
    <Note>No options configured.</Note>
  </div>
)

const meta: Meta<typeof Demo> = {
  title: 'XDS/Form/DynamicSelect (wrappers)',
  component: Demo,
}

export default meta
type Story = StoryObj<typeof Demo>

export const Default: Story = { render: () => <Demo /> }
