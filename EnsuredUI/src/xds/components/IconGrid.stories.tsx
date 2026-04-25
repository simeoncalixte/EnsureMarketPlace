import React from 'react'
import type { Meta } from '@storybook/react'
import IconGrid from './IconGrid'

const meta: Meta<typeof IconGrid> = {
  title: 'XDS/IconGrid',
  component: IconGrid
}

export default meta

export const Default = () => (
  <IconGrid items={[{ label: 'Shield' }, { label: 'Metrics' }, { label: 'Layers' }, { label: 'Trust' }, { label: 'Node' }]} />
)
