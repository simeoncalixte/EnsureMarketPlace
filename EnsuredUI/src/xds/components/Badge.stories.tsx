import React from 'react'
import type { Meta } from '@storybook/react'
import Badge from './Badge'

const meta: Meta<typeof Badge> = {
  title: 'XDS/Badge',
  component: Badge
}

export default meta

export const Variants = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
    <Badge variant="primary">Bound</Badge>
    <Badge variant="surface">Pending</Badge>
    <Badge variant="secondary">Claim</Badge>
    <Badge variant="tertiary">Historical</Badge>
  </div>
)
