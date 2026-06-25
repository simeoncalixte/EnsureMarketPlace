import React from 'react'
import type { Meta } from '@storybook/react'
import TopNavBar from './TopNavBar'
import type { AuthUser } from '../../lib/useAuthMe'

const meta: Meta<typeof TopNavBar> = {
  title: 'XDS/TopNavBar',
  component: TopNavBar,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'app', values: [{ name: 'app', value: '#071129' }] }
  }
}

export default meta

const demoUser: AuthUser = {
  id: 1,
  email: 'amara.okeke@sovereign-re.com',
  firstName: 'Amara',
  lastName: 'Okeke',
  organizationId: 5
} as AuthUser

const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ background: '#071129', minHeight: '12rem' }}>{children}</div>
)

export const Unauthenticated = () => (
  <Frame>
    <TopNavBar />
  </Frame>
)

export const AuthenticatedSidebarClosed = () => (
  <Frame>
    <TopNavBar user={demoUser} isSidebarOpen={false} onToggleSidebar={() => {}} />
  </Frame>
)

export const AuthenticatedSidebarOpen = () => (
  <Frame>
    <TopNavBar user={demoUser} isSidebarOpen onToggleSidebar={() => {}} />
  </Frame>
)

export const Default = AuthenticatedSidebarClosed
