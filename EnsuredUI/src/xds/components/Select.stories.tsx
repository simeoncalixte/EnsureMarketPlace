import React from 'react'
import type { Meta } from '@storybook/react'
import Select from './Select'

const meta: Meta<typeof Select> = {
  title: 'XDS/Select',
  component: Select
}

export default meta

export const Default = () => (
  <Select>
    <option>Select Tranche Level</option>
    <option>Junior Equity</option>
    <option>Mezzanine Debt</option>
    <option>Senior Secure</option>
  </Select>
)
