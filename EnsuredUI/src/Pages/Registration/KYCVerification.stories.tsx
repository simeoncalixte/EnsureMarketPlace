import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, waitFor, within } from '@storybook/test'
import { reactRouterParameters } from 'storybook-addon-remix-react-router'
import KYCVerification from './KYCVerification'

const SESSION_KEY = 'registrationSession'

function seedRegistrationRole(role: 'institutional' | 'insurer' | 'underwriter' | 'claims' | 'broker' | 'admin' = 'institutional') {
  window.localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      selectedRole: role,
      currentStep: 'kyc',
      updatedAt: new Date().toISOString(),
    }),
  )
}

const Surface: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ background: '#071129', minHeight: '100vh' }}>{children}</div>
)

function configureRegistrationApiBase(): void {
  if (typeof window !== 'undefined') {
    const runtimeWindow = window as Window & { __VITE_API_BASE?: string }
    runtimeWindow.__VITE_API_BASE = 'http://localhost:3001'
  }
}

function seedAuthenticatedRegistrationSession(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      selectedRole: 'institutional',
      currentStep: 'kyc',
      updatedAt: new Date().toISOString(),
    }),
  )
}

const meta: Meta<typeof KYCVerification> = {
  title: 'Pages/Registration/KYCVerification',
  component: KYCVerification,
  parameters: {
    layout: 'fullscreen',
    reactRouter: reactRouterParameters({
      location: {
        path: '/auth/register/kyc',
      },
      routing: {
        path: '/auth/register/kyc',
        useStoryElement: true,
      },
    }),
  },
  loaders: [
    async () => {
      seedRegistrationRole('institutional')
      return {}
    },
  ],
  render: () => (
    <Surface>
      <KYCVerification />
    </Surface>
  ),
}

export default meta

type Story = StoryObj<typeof KYCVerification>

function makeUniqueSeed(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

async function fillIdentityOnly(canvas: ReturnType<typeof within>) {
  const seed = makeUniqueSeed()
  await userEvent.type(await canvas.findByLabelText(/legal full name/i), `Morgan Riskwell ${seed.slice(-6)}`)
  await userEvent.type(await canvas.findByLabelText(/date of birth/i), '1986-04-19')
  await userEvent.type(await canvas.findByLabelText(/nationality \/ citizenship/i), 'United States')
  await userEvent.type(await canvas.findByLabelText(/residential address/i), '101 Harbor View, New York, NY 10001, USA')
  await userEvent.type(await canvas.findByLabelText(/phone number/i), '+1 555 010 3344')
  await userEvent.type(await canvas.findByLabelText(/email address/i), `morgan.riskwell+${seed}@sovereignre.test`)
}

async function uploadAllDocuments(canvas: ReturnType<typeof within>) {
  const uploadInputs = await canvas.findAllByLabelText(/^upload /i)
  const fixture = new File(['kyc-doc'], 'kyc-proof.txt', { type: 'text/plain' })
  for (const input of uploadInputs) {
    await userEvent.upload(input as HTMLInputElement, fixture)
  }
}

export const Default: Story = {}

export const ErrorMissingIdentity: Story = {
  name: 'Error: Missing Identity Fields',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole('button', { name: /proceed to capital profiling/i }))
    await expect(await canvas.findByText(/full legal name is required/i)).toBeInTheDocument()
    await expect(await canvas.findByText(/email address is required/i)).toBeInTheDocument()
  },
}

export const ErrorMissingRequiredDocuments: Story = {
  name: 'Error: Missing Required Documents',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await fillIdentityOnly(canvas)
    await userEvent.click(await canvas.findByRole('button', { name: /proceed to capital profiling/i }))
    const docErrors = await canvas.findAllByText(/upload is required for/i)
    await expect(docErrors.length).toBeGreaterThan(0)
  },
}

export const ErrorMissingLiveness: Story = {
  name: 'Error: Missing Liveness Check',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await fillIdentityOnly(canvas)
    await uploadAllDocuments(canvas)
    await userEvent.click(await canvas.findByRole('button', { name: /proceed to capital profiling/i }))
    await expect(await canvas.findByText(/complete liveness detection to continue/i)).toBeInTheDocument()
  },
}

export const AllValidationSatisfied: Story = {
  name: 'No Error: All Validation Satisfied',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    configureRegistrationApiBase()
    seedAuthenticatedRegistrationSession()
    await fillIdentityOnly(canvas)
    await uploadAllDocuments(canvas)
    await userEvent.click(await canvas.findByRole('button', { name: /start camera|camera verified/i }))
    await userEvent.click(await canvas.findByRole('button', { name: /proceed to capital profiling/i }))
    await expect(canvas.queryByText(/is required/i)).not.toBeInTheDocument()
    await expect(canvas.queryByText(/complete liveness detection to continue/i)).not.toBeInTheDocument()

    // KYC's job ends at creating the backend user and parking the auth token for
    // the subsequent subscription paywall step (it routes to /auth/register/subscription,
    // which is not mounted in this isolated story).
    await waitFor(() => {
      const session = JSON.parse(window.localStorage.getItem(SESSION_KEY) ?? '{}') as {
        backendRegistrationId?: string
        backendUserId?: number
        pendingAuthToken?: string
      }
      expect(session.backendRegistrationId).toEqual(expect.any(String))
      expect(session.backendUserId).toEqual(expect.any(Number))
      expect(session.pendingAuthToken).toEqual(expect.any(String))
    }, { timeout: 15000 })
  },
}
