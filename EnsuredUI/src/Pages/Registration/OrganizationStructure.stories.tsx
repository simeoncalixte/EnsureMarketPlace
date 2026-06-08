import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from '@storybook/test'
import { reactRouterParameters } from 'storybook-addon-remix-react-router'
import OrganizationStructure from './OrganizationStructure'

const meta: Meta<typeof OrganizationStructure> = {
  title: 'Pages/Registration/OrganizationStructure',
  component: OrganizationStructure,
  parameters: {
    layout: 'fullscreen',
    reactRouter: reactRouterParameters({
      location: {
        path: '/auth/register/organization-structure',
      },
      routing: {
        path: '/auth/register/organization-structure',
        useStoryElement: true,
      },
    }),
  },
}

export default meta

type Story = StoryObj<typeof OrganizationStructure>

export const Default: Story = {}

export const LinkByInvitationCode: Story = {
  name: 'Link by Invitation Code',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole('button', { name: /use invitation code/i }))
    await userEvent.type(await canvas.findByLabelText(/invitation code/i), 'ORG-84A1-3XQ7')
    await userEvent.click(await canvas.findByRole('button', { name: /link organization/i }))
    await expect(await canvas.findByText(/invitation code org-84a1-3xq7 is linked/i)).toBeInTheDocument()
  },
}

export const RequestAccessForWalkOnOrg: Story = {
  name: 'Request Access for Walk-On Organization',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole('button', { name: /request access to an open organization/i }))
    await userEvent.click(await canvas.findByRole('button', { name: /atlas risk collective/i }))
    await expect(await canvas.findByText(/request submitted for atlas risk collective/i)).toBeInTheDocument()
  },
}

export const RegisterWithBusinessDetails: Story = {
  name: 'Register With Business Details',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole('button', { name: /register with business details/i }))
    await userEvent.type(await canvas.findByLabelText(/business legal name/i), 'Atlantic Risk Holdings LLC')
    await userEvent.type(await canvas.findByLabelText(/registration number/i), 'ARH-2026-001')
    await userEvent.type(await canvas.findByLabelText(/registered business address/i), '101 Harbor View, New York, NY 10001, USA')
    await userEvent.type(await canvas.findByLabelText(/business contact email/i), 'ops@atlanticrisk.test')
    await expect(await canvas.findByRole('button', { name: /continue to account access/i })).toBeInTheDocument()
  },
}
