import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect, fn } from '@storybook/test'
import DocumentRow from './DocumentRow'

const meta: Meta<typeof DocumentRow> = {
  title: 'XDS/DocumentRow',
  component: DocumentRow,
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    docStatus: { control: 'inline-radio', options: ['required', 'optional', 'verified'] },
    uploaded: { control: 'boolean' },
    uploadedFilename: { control: 'text' },
    ariaLabel: { control: 'text' },
    error: { control: 'text' }
  }
}

export default meta
type Story = StoryObj<typeof DocumentRow>

export const Required: Story = {
  args: {
    title: 'Certificate of Incorporation',
    description: 'Official registration document for the entity.',
    docStatus: 'required',
    uploaded: false
  }
}

export const Optional: Story = {
  args: {
    title: 'Audited Financials',
    description: 'Most recent audited financial statements.',
    docStatus: 'optional',
    uploaded: false
  }
}

export const Verified: Story = {
  args: {
    title: 'Proof of Address',
    description: 'Utility bill or bank statement under 3 months old.',
    docStatus: 'verified',
    uploaded: true,
    uploadedFilename: 'proof-of-address.pdf'
  }
}

export const WithError: Story = {
  args: {
    title: 'Tax Identification',
    description: 'Government-issued tax ID document.',
    docStatus: 'required',
    uploaded: false,
    error: 'File exceeds the 10MB limit.'
  }
}

// Interaction test: renders required-row content and fires onUpload when a file is selected.
export const UploadInteraction: Story = {
  args: {
    title: 'Certificate of Incorporation',
    description: 'Official registration document for the entity.',
    docStatus: 'required',
    uploaded: false,
    onUpload: fn()
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    // Row content is rendered.
    await expect(canvas.getByText('Certificate of Incorporation')).toBeInTheDocument()
    await expect(canvas.getByText('Official registration document for the entity.')).toBeInTheDocument()

    // The accessible file input is present and selecting a file fires onUpload.
    const input = canvas.getByLabelText('Upload Certificate of Incorporation') as HTMLInputElement
    const file = new File(['hello'], 'incorporation.pdf', { type: 'application/pdf' })
    await userEvent.upload(input, file)
    await expect(args.onUpload).toHaveBeenCalled()
  }
}

// Interaction test: a verified row exposes a View action that fires onView when clicked.
export const ViewInteraction: Story = {
  args: {
    title: 'Proof of Address',
    description: 'Utility bill or bank statement.',
    docStatus: 'verified',
    uploaded: true,
    uploadedFilename: 'proof-of-address.pdf',
    onView: fn()
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    // Verified badge and filename are shown.
    await expect(canvas.getByText('✓ Verified')).toBeInTheDocument()
    await expect(canvas.getByText('proof-of-address.pdf')).toBeInTheDocument()

    // Clicking the view control fires onView.
    await userEvent.click(canvas.getByTitle('View document'))
    await expect(args.onView).toHaveBeenCalled()
  }
}
