import React from 'react'
import type { Meta } from '@storybook/react'
import StatCard from './StatCard'

const meta: Meta<typeof StatCard> = {
  title: 'XDS/StatCard',
  component: StatCard
}

export default meta

export const Default = () => (
  <div style={{ display: 'flex', gap: 24 }}>
    <StatCard label="Total Allocated" value="$42.8M" delta="+12.4%" />
    <StatCard label="Risk Coefficient" value="0.042" delta="-0.002" />
  </div>
)
