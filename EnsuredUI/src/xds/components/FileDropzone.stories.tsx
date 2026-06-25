import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect, fn } from '@storybook/test'
import FileDropzone from './FileDropzone'

const meta: Meta<typeof FileDropzone> = {
  title: 'XDS/Form/FileDropzone',
  component: FileDropzone
}

export default meta

type Story = StoryObj<typeof FileDropzone>

export const Default: Story = {
  args: {
    id: 'dropzone-default',
    title: 'Drag & drop a file here',
    helperText: 'or click to browse — PDF, CSV up to 10MB',
    accept: '.pdf,.csv'
  }
}

export const WithUploadedFile: Story = {
  args: {
    id: 'dropzone-uploaded',
    title: 'Drag & drop a file here',
    helperText: 'or click to browse',
    uploadedFilename: 'policy-schedule-2026.pdf'
  }
}

export const UploadInteraction: Story = {
  args: {
    id: 'dropzone-interaction',
    title: 'Drag & drop a file here',
    helperText: 'or click to browse',
    onFile: fn()
  },
  render: (args) => {
    const [name, setName] = useState<string | undefined>(undefined)
    return (
      <FileDropzone
        {...args}
        uploadedFilename={name}
        onFile={(file) => {
          setName(file.name)
          args.onFile?.(file)
        }}
      />
    )
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText('Drag & drop a file here') as HTMLInputElement
    const file = new File(['hello world'], 'submission.csv', { type: 'text/csv' })

    await userEvent.upload(input, file)

    await expect(args.onFile).toHaveBeenCalled()
    await expect(input.files?.[0]).toBe(file)
    await expect(await canvas.findByText('submission.csv')).toBeInTheDocument()
  }
}
