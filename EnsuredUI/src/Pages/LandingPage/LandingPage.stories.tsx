import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Route, Routes } from 'react-router'
import { reactRouterParameters } from 'storybook-addon-remix-react-router'
import LandingPage from './LandingPage'
import RoleSelection from '../Registration/RoleSelection'
import TopBarNav from '../../xds/components/TopBarNav'
import { button, click, play, seeHeading, seeText } from '../../test-helpers/play'

const shellStyle: React.CSSProperties = {
  background: '#071129',
  minHeight: '100vh',
  color: '#dae2fd',
}

const LandingApp: React.FC = () => (
  <Routes>
    <Route
      path="/"
      element={
        <div style={shellStyle}>
          <TopBarNav user={null} />
          <LandingPage />
        </div>
      }
    />
    <Route path="/auth/register" element={<div style={shellStyle}><RoleSelection /></div>} />
  </Routes>
)

const meta: Meta<typeof LandingApp> = {
  title: 'Pages/LandingPage',
  component: LandingApp,
  parameters: {
    layout: 'fullscreen',
    reactRouter: reactRouterParameters({
      location: { path: '/' },
      routing: {
        path: '/',
        useStoryElement: true,
        children: [{ path: '*' }],
      },
    }),
  },
}

export default meta

type Story = StoryObj<typeof LandingApp>

export const Default: Story = {
  render: () => <LandingApp />,
}

export const HeroCtaLeadsToRegistration: Story = {
  name: 'Hero CTA → Registration',
  render: () => <LandingApp />,
  play: play(
    // Welcoming essentials: hero message, honest metrics, role cards, footer.
    seeHeading(/from submission inbox/i),
    seeText(/guided setup/i),
    seeText('Insurers & MGAs'),
    seeText('Brokers'),
    seeText('Underwriters'),
    seeText('Capital providers'),
    seeText(/NASA Earth Observatory/i),
    // The primary CTA must actually take the visitor into registration.
    click(button(/create your workspace/i)),
    seeHeading(/define your role/i),
  ),
}
