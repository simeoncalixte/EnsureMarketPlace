import React from 'react'
import type { Meta } from '@storybook/react'
import { expect, within } from '@storybook/test'
import NavigationSkeleton from './NavigationSkeleton'
import SideNavBar from './SideNavBar'

const meta: Meta<typeof NavigationSkeleton> = {
  title: 'XDS/NavigationSkeleton',
  component: NavigationSkeleton
}

export default meta

export const Default = () => (
  <div style={{ background: '#071129', minHeight: '100vh', padding: 20, width: 280 }}>
    <NavigationSkeleton />
  </div>
)

Default.play = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  const canvas = within(canvasElement)
  const skeleton = await canvas.findByTestId('navigation-skeleton')
  await expect(skeleton).toBeInTheDocument()
  // Decorative only — must be hidden from assistive tech.
  await expect(skeleton).toHaveAttribute('aria-hidden', 'true')
}

/** The skeleton as the sidebar actually renders it while `/api/navigation` resolves. */
export const InSidebar = () => (
  <div style={{ background: '#071129', minHeight: '100vh', padding: 20 }}>
    <SideNavBar title="Ensured Marketplace" subtitle="Resolving your workspace…" isOpen loading />
  </div>
)

InSidebar.play = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  const canvas = within(canvasElement)
  await expect(await canvas.findByTestId('navigation-skeleton')).toBeInTheDocument()
}
