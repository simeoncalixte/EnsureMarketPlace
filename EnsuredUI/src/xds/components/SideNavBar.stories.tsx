import React from 'react'
import type { Meta } from '@storybook/react'
import SideNavBar from './SideNavBar'
import { saveAuthToken } from '../../lib/auth'

const meta: Meta<typeof SideNavBar> = {
  title: 'XDS/SideNavBar',
  component: SideNavBar
}

export default meta

export const Default = () => {
  if (typeof window !== 'undefined') {
    saveAuthToken(null)
  }

  return (
    <div style={{ background: '#071129', minHeight: '100vh', padding: 20 }}>
      <SideNavBar />
    </div>
  )
}

export const WithLogout = () => {
  if (typeof window !== 'undefined') {
    saveAuthToken('storybook-demo-token')
  }

  return (
    <div style={{ background: '#071129', minHeight: '100vh', padding: 20 }}>
      <SideNavBar
        title="Ensured Marketplace"
        subtitle="Institutional Session"
        isOpen
        onLogout={() => {
          saveAuthToken(null)
          window.alert('Signed out')
        }}
      />
    </div>
  )
}
