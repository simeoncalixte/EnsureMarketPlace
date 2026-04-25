import React from 'react'
import type { Meta } from '@storybook/react'
import Navigation from './Navigation'

const meta: Meta<typeof Navigation> = {
  title: 'XDS/Navigation',
  component: Navigation
}

export default meta

export const Default = () => (
  <Navigation
    items={[
      { id: 't1', label: 'Terminal', active: true },
      { id: 't2', label: 'Risk Modeling' },
      { id: 't3', label: 'Governance' }
    ]}
  />
)

export const WithSubRoutes = () => (
  <Navigation
    items={[
      { id: 't1', label: 'Terminal', active: true, subItems: [
        { id: 't1-1', label: 'Overview' },
        { id: 't1-2', label: 'Settings' }
      ] },
      { id: 't2', label: 'Risk Modeling', subItems: [
        { id: 't2-1', label: 'Upload' },
        { id: 't2-2', label: 'Runs' }
      ] },
      { id: 't3', label: 'Governance' }
    ]}
  />
)
