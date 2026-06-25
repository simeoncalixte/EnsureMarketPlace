import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import FilePreviewGallery, { PreviewFile } from './FilePreviewGallery'

const meta: Meta<typeof FilePreviewGallery> = {
  title: 'XDS/FilePreviewGallery',
  component: FilePreviewGallery,
}

export default meta
type Story = StoryObj<typeof FilePreviewGallery>

// A tiny inline SVG so the image preview renders without a backend.
const SVG_DATA_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"><rect width="200" height="120" fill="#274690"/></svg>')

const FILES: PreviewFile[] = [
  {
    id: 1,
    fileName: 'site-photo.svg',
    mimeType: 'image/svg+xml',
    fileSize: 2048,
    contentUrl: SVG_DATA_URL,
  },
  {
    id: 2,
    fileName: 'submission-extract.txt',
    mimeType: 'text/plain; charset=utf-8',
    fileSize: 695,
    contentUrl: '#',
    textPreview: 'Reinsurance Submission Extract\nCedent: Cascadia Mutual\nLine of Business: Aviation',
  },
  {
    id: 3,
    fileName: 'loss-run.xlsm',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileSize: 18_432,
    contentUrl: '#',
    textPreview: 'Loss Run - 5 Year History\nClaim CLM-0908 Paid $92,000 Cause: Hail',
  },
  {
    id: 4,
    fileName: 'cat-model-output.bin',
    mimeType: 'application/octet-stream',
    fileSize: 1_048_576,
    contentUrl: '#',
  },
]

export const AllFileTypes: Story = {
  args: { files: FILES },
}

export const Empty: Story = {
  args: { files: [], emptyMessage: 'No files are attached to this submission.' },
}

// Interaction test: every file gets a card with SOME preview (image, text,
// extracted text, or an explicit placeholder), and the preview can be toggled.
export const PreviewInteraction: Story = {
  args: { files: FILES },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Every file is listed by name.
    for (const file of FILES) {
      await expect(canvas.getByText(file.fileName)).toBeInTheDocument()
    }

    // Image preview renders an <img>.
    await expect(canvas.getByAltText('Preview of site-photo.svg')).toBeInTheDocument()

    // Text and extracted-text previews render their content.
    await expect(canvas.getByText(/Reinsurance Submission Extract/)).toBeInTheDocument()
    await expect(canvas.getByText(/Loss Run - 5 Year History/)).toBeInTheDocument()

    // A format with no renderable content still presents an explicit preview placeholder.
    await expect(canvas.getByText('No inline preview for this format.')).toBeInTheDocument()

    // The extracted-text badge marks the universal fallback.
    await expect(canvas.getByText('Extracted Text')).toBeInTheDocument()

    // Toggling hides and restores a preview.
    const toggle = canvas.getByLabelText('Toggle preview of submission-extract.txt')
    await userEvent.click(toggle)
    await expect(canvas.queryByText(/Reinsurance Submission Extract/)).not.toBeInTheDocument()
    await userEvent.click(toggle)
    await expect(canvas.getByText(/Reinsurance Submission Extract/)).toBeInTheDocument()
  },
}
