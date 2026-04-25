import React from 'react'
import type { Meta } from '@storybook/react'
import SideNavBar from './SideNavBar'

const meta: Meta<typeof SideNavBar> = {
  title: 'XDS/SideNavBar',
  component: SideNavBar
}

export default meta

export const Default = () => (
  <div style={{ background: '#071129', minHeight: '100vh', padding: 20 }}>
    <SideNavBar />
  </div>
)
