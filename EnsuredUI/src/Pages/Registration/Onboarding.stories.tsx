import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from '@storybook/test'
import { Route, Routes } from 'react-router'
import { reactRouterParameters } from 'storybook-addon-remix-react-router'
import Onboarding from './Onboarding'
import { play, seePressed } from '../../test-helpers/play'

const shellStyle: React.CSSProperties = { background: '#071129', minHeight: '100vh', color: '#dae2fd' }

/** Stub destination so the post-signup redirect is observable against a real backend. */
const MarketplaceStub: React.FC = () => (
  <div style={{ ...shellStyle, padding: 40 }}>
    <h1>Marketplace</h1>
    <p>Welcome to your workspace.</p>
  </div>
)

const OnboardingApp: React.FC = () => (
  <Routes>
    <Route path="/auth/register" element={<div style={shellStyle}><Onboarding /></div>} />
    <Route path="/marketplace" element={<MarketplaceStub />} />
    <Route path="/auth/login" element={<div style={shellStyle}><h1>Sign in</h1></div>} />
  </Routes>
)

const meta: Meta<typeof OnboardingApp> = {
  title: 'Pages/Registration/Onboarding',
  component: OnboardingApp,
  parameters: {
    layout: 'fullscreen',
    reactRouter: reactRouterParameters({
      location: { path: '/auth/register' },
      routing: { path: '/', useStoryElement: true, children: [{ path: '*' }] },
    }),
  },
}

export default meta

type Story = StoryObj<typeof OnboardingApp>

export const Default: Story = {
  render: () => <OnboardingApp />,
}

// Landing "Pick your side of the desk" cards hand off the chosen role via
// `?role=`. This is the registration-side contract: a role in the query arrives
// pre-selected. `investor` (the landing label for capital providers) is mapped
// to the canonical `institutional` role.
export const PreselectsRoleFromQuery: Story = {
  name: 'Pre-selects role from ?role= (capital provider)',
  render: () => <OnboardingApp />,
  parameters: {
    reactRouter: reactRouterParameters({
      location: { path: '/auth/register', searchParams: { role: 'investor' } },
      routing: { path: '/', useStoryElement: true, children: [{ path: '*' }] },
    }),
  },
  play: play(seePressed(/capital provider/i)),
}

export const ValidationGating: Story = {
  name: 'Welcoming, low-friction, no admin',
  render: () => <OnboardingApp />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(await canvas.findByRole('heading', { name: /create your workspace/i })).toBeInTheDocument()

    // Admin is not an option (provisioned internally, never self-registered). #35
    expect(canvas.queryByText(/platform admin/i)).not.toBeInTheDocument()

    // No KYC / document / payment friction is present on the signup screen.
    expect(canvas.queryByText(/passport/i)).not.toBeInTheDocument()
    expect(canvas.queryByText(/upload/i)).not.toBeInTheDocument()
    expect(canvas.queryByText(/card number/i)).not.toBeInTheDocument()
    // Organization is explicitly optional.
    await expect(canvas.getByRole('button', { name: /i’ll do this later/i })).toBeInTheDocument()

    // The primary CTA is gated until role + valid account fields are present.
    const submit = canvas.getByRole('button', { name: /create workspace/i })
    await expect(submit).toBeDisabled()

    await userEvent.click(canvas.getByRole('button', { name: /insurer/i }))
    await userEvent.type(canvas.getByLabelText(/work email/i), 'casey@atlas-risk.test')
    await userEvent.type(canvas.getByLabelText(/^password$/i), 'a-strong-password')
    await userEvent.type(canvas.getByLabelText(/confirm password/i), 'a-strong-password')

    // With role + matching valid credentials, onboarding can proceed.
    await expect(submit).toBeEnabled()
  },
}

export const SocialSignup: Story = {
  name: 'Google / Microsoft sign-up entry points',
  render: () => <OnboardingApp />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const google = await canvas.findByRole('button', { name: /continue with google/i })
    const microsoft = canvas.getByRole('button', { name: /continue with microsoft/i })
    await expect(google).toBeInTheDocument()
    await expect(microsoft).toBeInTheDocument()

    // A provider button without a chosen role explains itself instead of
    // bouncing the user to a consent screen that can't finish sign-up.
    await userEvent.click(google)
    await expect(await canvas.findByRole('alert')).toHaveTextContent(/choose how you’ll use ensured/i)
    // (With a role selected the click performs a full-page navigation to the
    // API's /auth/oauth/:provider/start — not exercisable inside Storybook.)
  },
}
