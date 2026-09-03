import React from 'react'
import type { Meta } from '@storybook/react'
import LandingPage from './LandingPage'
import TopBarNav from '../../xds/components/TopBarNav'

const meta: Meta = {
  title: 'Pages/LandingPage'
}

export default meta

const shellStyle: React.CSSProperties = {
  background: 'var(--xds-background)',
  minHeight: '100vh',
  color: 'var(--xds-text-primary)',
}

export const Default = () => (
  <div style={shellStyle}>
    <TopBarNav user={null} />
    <LandingPage />
  </div>
)
