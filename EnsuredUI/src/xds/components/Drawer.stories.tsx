import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect, waitFor } from '@storybook/test'
import Drawer from './Drawer'
import Button from './Button'

const Host: React.FC<{ startOpen?: boolean }> = ({ startOpen = false }) => {
  const [open, setOpen] = useState(startOpen)
  return (
    <div style={{ background: '#071129', padding: 24, minHeight: 360 }}>
      <Button onClick={() => setOpen(true)}>Open drawer</Button>
      <Drawer
        open={open}
        title="US / Florida"
        subtitle="State · resolves into US"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => setOpen(false)}>Save</Button>
          </>
        }
      >
        <div style={{ color: '#dae2fd' }}>Drawer body content goes here.</div>
      </Drawer>
    </div>
  )
}

const meta: Meta<typeof Drawer> = {
  title: 'XDS/Drawer',
  component: Drawer,
  parameters: { layout: 'fullscreen' },
}
export default meta

type Story = StoryObj<typeof Drawer>

export const Closed: Story = { render: () => <Host /> }
export const Open: Story = { render: () => <Host startOpen /> }

export const OpensAndCloses: Story = {
  render: () => <Host />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: /open drawer/i }))
    await expect(await canvas.findByRole('dialog', { name: /US \/ Florida/i })).toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: /^close$/i }))
    await waitFor(() => expect(canvas.queryByRole('dialog')).not.toBeInTheDocument())
  },
}
