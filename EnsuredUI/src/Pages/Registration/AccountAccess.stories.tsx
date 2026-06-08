import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from '@storybook/test'
import { Route, Routes } from 'react-router'
import { reactRouterParameters } from 'storybook-addon-remix-react-router'
import AccountAccess from './AccountAccess'
import CapitalProfile from './CapitalProfile'

type RegistrationApproach = 'invitation-code' | 'request-access' | 'business-details'

type RoleKey = 'institutional' | 'insurer' | 'underwriter' | 'claims' | 'broker' | 'admin'

type SocialProvider = 'gmail' | 'facebook' | 'microsoft'

const StorySurface: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ background: '#071129', minHeight: '100vh' }}>{children}</div>
)

const AccountAccessApp: React.FC = () => (
  <Routes>
    <Route path="/auth/register/account-access" element={<StorySurface><AccountAccess /></StorySurface>} />
    <Route path="/auth/register/capital-profile" element={<StorySurface><CapitalProfile /></StorySurface>} />
  </Routes>
)

const meta: Meta<typeof AccountAccessApp> = {
  title: 'Pages/Registration/AccountAccess',
  component: AccountAccessApp,
  parameters: {
    layout: 'fullscreen',
    reactRouter: reactRouterParameters({
      location: {
        path: '/auth/register/account-access',
      },
      routing: {
        path: '/',
        useStoryElement: true,
        children: [{ path: '*' }],
      },
    }),
  },
}

export default meta

type Story = StoryObj<typeof AccountAccessApp>

function seedRegistrationSession(session: {
  selectedRole: RoleKey
  registrationApproach: RegistrationApproach
  organizationLinkMode: RegistrationApproach
  organizationName: string
  organizationReference: string
  invitationCode?: string
  businessDetails?: {
    legalName: string
    tradingName: string
    registrationNumber: string
    address: string
    contactEmail: string
    website: string
  }
  accountMethod?: 'organization-email' | 'username-password' | 'social'
  socialProvider?: SocialProvider
  organizationEmail?: string
  username?: string
}) {
  window.localStorage.setItem(
    'registrationSession',
    JSON.stringify({
      ...session,
      currentStep: 'account-access',
      updatedAt: new Date().toISOString(),
    }),
  )
}

export const Default: Story = {
  render: () => <AccountAccessApp />,
}

export const InvitationCodePathEmailConnection: Story = {
  name: 'Invitation Code Path - Connect Organization Email',
  loaders: [
    async () => {
      seedRegistrationSession({
        selectedRole: 'underwriter',
        registrationApproach: 'invitation-code',
        organizationLinkMode: 'invitation-code',
        organizationName: 'Organization linked with ORG-84A1-3XQ7',
        organizationReference: 'ORG-84A1-3XQ7',
        invitationCode: 'ORG-84A1-3XQ7',
      })
      return {}
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole('heading', { name: /account access/i })).toBeInTheDocument()
    await userEvent.type(await canvas.findByLabelText(/organization email address/i), 'underwriting@atlas-risk.test')
    await userEvent.click(await canvas.findByRole('button', { name: /connect email and continue/i }))
    await expect(await canvas.findByRole('heading', { name: /capital profile/i })).toBeInTheDocument()
  },
}

export const RequestAccessPathEmailConnection: Story = {
  name: 'Request Access Path - Connect Organization Email',
  loaders: [
    async () => {
      seedRegistrationSession({
        selectedRole: 'claims',
        registrationApproach: 'request-access',
        organizationLinkMode: 'request-access',
        organizationName: 'Atlas Risk Collective',
        organizationReference: 'atlas-risk-collective',
      })
      return {}
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole('heading', { name: /account access/i })).toBeInTheDocument()
    await userEvent.click(await canvas.findByRole('button', { name: /connect organization email/i }))
    await userEvent.type(await canvas.findByLabelText(/organization email address/i), 'claims@atlas-risk.test')
    await userEvent.click(await canvas.findByRole('button', { name: /connect email and continue/i }))
    await expect(await canvas.findByRole('heading', { name: /capital profile/i })).toBeInTheDocument()
  },
}

export const BusinessDetailsPathUsernamePassword: Story = {
  name: 'Business Details Path - Username and Password',
  loaders: [
    async () => {
      seedRegistrationSession({
        selectedRole: 'admin',
        registrationApproach: 'business-details',
        organizationLinkMode: 'business-details',
        organizationName: 'Atlantic Risk Holdings LLC',
        organizationReference: 'ARH-2026-001',
        businessDetails: {
          legalName: 'Atlantic Risk Holdings LLC',
          tradingName: 'Atlantic Risk',
          registrationNumber: 'ARH-2026-001',
          address: '101 Harbor View, New York, NY 10001, USA',
          contactEmail: 'ops@atlanticrisk.test',
          website: 'https://atlanticrisk.test',
        },
      })
      return {}
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole('heading', { name: /account access/i })).toBeInTheDocument()
    await userEvent.click(await canvas.findByRole('button', { name: /sign up with username and password/i }))
    await userEvent.type(await canvas.findByLabelText(/^username$/i), 'atlantic.admin')
    await userEvent.type(await canvas.findByLabelText(/^password$/i), 'password123')
    await userEvent.type(await canvas.findByLabelText(/confirm password/i), 'password123')
    await userEvent.click(await canvas.findByRole('button', { name: /create account and continue/i }))
    await expect(await canvas.findByRole('heading', { name: /capital profile/i })).toBeInTheDocument()
  },
}

export const SocialSignUpProviders: Story = {
  name: 'Request Access Path - Social Sign-Up Providers',
  loaders: [
    async () => {
      seedRegistrationSession({
        selectedRole: 'broker',
        registrationApproach: 'request-access',
        organizationLinkMode: 'request-access',
        organizationName: 'Northstar Risk Exchange',
        organizationReference: 'northstar-risk-exchange',
      })
      return {}
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole('heading', { name: /account access/i })).toBeInTheDocument()
    await userEvent.click(await canvas.findByRole('button', { name: /sign up with gmail, facebook, or microsoft/i }))
    await expect(await canvas.findByRole('button', { name: /sign up with gmail/i })).toBeInTheDocument()
    await expect(await canvas.findByRole('button', { name: /sign up with facebook/i })).toBeInTheDocument()
    await expect(await canvas.findByRole('button', { name: /sign up with microsoft/i })).toBeInTheDocument()
    await userEvent.click(await canvas.findByRole('button', { name: /sign up with microsoft/i }))
    await userEvent.click(await canvas.findByRole('button', { name: /continue with microsoft/i }))
    await expect(await canvas.findByRole('heading', { name: /capital profile/i })).toBeInTheDocument()
  },
}
