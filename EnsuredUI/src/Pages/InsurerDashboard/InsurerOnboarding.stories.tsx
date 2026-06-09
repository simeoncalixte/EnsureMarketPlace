import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect, waitFor } from '@storybook/test'
import { Route, Routes, useLocation, useNavigate } from 'react-router'
import { reactRouterParameters } from 'storybook-addon-remix-react-router'
import InsurerOnboarding, { dismissedKey } from './InsurerOnboarding'
import type { OnboardingStep } from '../../xds/components/OnboardingChecklist'

// Partial state: appetite done, channels current, submissions todo.
const partialSteps: OnboardingStep[] = [
  {
    id: 'appetite',
    title: 'Define your appetite',
    description: 'Set deployable capital, lines of business, and preferred perils.',
    status: 'complete',
    actionLabel: 'Define appetite',
  },
  {
    id: 'channels',
    title: 'Connect an ingestion channel',
    description: 'Wire up a feed so submissions flow in automatically.',
    status: 'current',
    actionLabel: 'Connect channel',
  },
  {
    id: 'submissions',
    title: 'See your first priced submission',
    description: 'Review a submission once your pipeline produces one.',
    status: 'todo',
    actionLabel: 'Open submissions',
  },
]

// A location probe so the play test can read the active route after navigation.
const LocationProbe: React.FC = () => {
  const location = useLocation()
  return <div data-testid="location-pathname">{location.pathname}</div>
}

const StorySurface: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ background: '#071129', padding: 24, minHeight: '100vh' }}>{children}</div>
)

/**
 * Renders the onboarding panel with deterministic override steps whose actions
 * deep-link via the real router (`useNavigate`). Because this component lives
 * inside the addon's router context, navigation is fully exercised.
 */
const RoutedOnboarding: React.FC = () => {
  const navigate = useNavigate()
  const steps = partialSteps.map((s) =>
    s.status === 'current'
      ? { ...s, onAction: () => navigate('/insurer/pipeline-ingestion') }
      : s,
  )
  return <InsurerOnboarding stepsOverride={steps} />
}

const Host: React.FC = () => (
  <Routes>
    <Route
      path="/insurer"
      element={
        <StorySurface>
          <RoutedOnboarding />
          <LocationProbe />
        </StorySurface>
      }
    />
    <Route
      path="/insurer/pipeline-ingestion"
      element={
        <StorySurface>
          <div>Pipeline Ingestion</div>
          <LocationProbe />
        </StorySurface>
      }
    />
  </Routes>
)

const meta: Meta<typeof InsurerOnboarding> = {
  title: 'Pages/InsurerDashboard/InsurerOnboarding',
  component: InsurerOnboarding,
  parameters: {
    layout: 'fullscreen',
    reactRouter: reactRouterParameters({
      location: { path: '/insurer' },
      routing: { path: '/', useStoryElement: true, children: [{ path: '*' }] },
    }),
  },
}

export default meta

type Story = StoryObj<typeof InsurerOnboarding>

export const Partial: Story = {
  render: () => <Host />,
}

export const Interactive: Story = {
  render: () => <Host />,
  loaders: [
    async () => {
      // Start clean so the panel is visible.
      window.localStorage.removeItem(dismissedKey(null))
      return {}
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Steps render.
    await expect(await canvas.findByText('Define your appetite')).toBeInTheDocument()
    await expect(canvas.getByText('Connect an ingestion channel')).toBeInTheDocument()

    // Clicking the current step's action navigates to its deep link.
    await userEvent.click(canvas.getByRole('button', { name: /connect channel/i }))
    await waitFor(() =>
      expect(canvas.getByTestId('location-pathname')).toHaveTextContent('/insurer/pipeline-ingestion'),
    )
  },
}

// Dedicated dismissal story — deterministic via stepsOverride, asserts the panel
// disappears and localStorage records the dismissed key.
const DismissHost: React.FC = () => (
  <StorySurface>
    <InsurerOnboarding stepsOverride={partialSteps} />
  </StorySurface>
)

export const Dismiss: Story = {
  render: () => <DismissHost />,
  loaders: [
    async () => {
      window.localStorage.removeItem(dismissedKey(null))
      return {}
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Panel is visible.
    await expect(await canvas.findByText('Define your appetite')).toBeInTheDocument()

    // Dismiss hides the panel AND persists the dismissed key.
    await userEvent.click(canvas.getByRole('button', { name: /dismiss onboarding checklist/i }))
    await waitFor(() => expect(canvas.queryByText('Define your appetite')).not.toBeInTheDocument())
    expect(window.localStorage.getItem(dismissedKey(null))).toBe('true')
  },
}
