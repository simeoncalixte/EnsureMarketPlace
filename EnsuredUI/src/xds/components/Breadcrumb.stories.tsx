import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import Breadcrumb from './Breadcrumb'

const meta: Meta<typeof Breadcrumb> = {
  title: 'XDS/Breadcrumb',
  component: Breadcrumb
}

export default meta

type Story = StoryObj<typeof Breadcrumb>

export const Default: Story = {
  args: {
    items: [
      { label: 'Terminal' },
      { label: 'Risk Modeling' },
      { label: 'Probability Curves' }
    ]
  }
}

export const WithLinks: Story = {
  args: {
    label: 'Navigation',
    items: [
      { label: 'Home', href: '/home' },
      { label: 'Insurers', href: '/insurers' },
      { label: 'Detail' }
    ]
  }
}

export const ClickableItems: Story = {
  render: () => {
    const [clicked, setClicked] = React.useState<string>('none')
    return (
      <div>
        <Breadcrumb
          label="Clickable"
          items={[
            {
              label: 'Dashboard',
              href: '#',
              onClick: (e) => {
                e.preventDefault()
                setClicked('Dashboard')
              }
            },
            { label: 'Settings', href: '#' },
            { label: 'Profile' }
          ]}
        />
        <div data-testid="clicked-output">clicked: {clicked}</div>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const dashboard = canvas.getByText('Dashboard')
    await userEvent.click(dashboard)
    await expect(canvas.getByTestId('clicked-output')).toHaveTextContent('clicked: Dashboard')

    // The last (current) item is rendered as a non-link with aria-current
    const current = canvas.getByText('Profile')
    await expect(current).toHaveAttribute('aria-current', 'page')
  }
}
