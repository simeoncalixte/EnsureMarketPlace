import React from 'react'
import type { Meta } from '@storybook/react'
import LandingPage from './LandingPage'
import TopBarNav from '../../xds/components/TopBarNav'

const meta: Meta = {
  title: 'Pages/LandingPage'
}

export default meta

const shellStyle: React.CSSProperties = {
  background: '#071129',
  minHeight: '100vh',
  color: '#dae2fd',
}

export const Default = () => (
  <div style={shellStyle}>
    <TopBarNav user={null} />
    <LandingPage />
  </div>
)
