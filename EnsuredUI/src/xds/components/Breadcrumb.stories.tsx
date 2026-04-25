import React from 'react'
import type { Meta } from '@storybook/react'
import Breadcrumb from './Breadcrumb'

const meta: Meta<typeof Breadcrumb> = {
  title: 'XDS/Breadcrumb'
}

export default meta

export const Default = () => (
  <Breadcrumb
    items={[{ label: 'Terminal' }, { label: 'Risk Modeling' }, { label: 'Probability Curves' }]}
  />
)
