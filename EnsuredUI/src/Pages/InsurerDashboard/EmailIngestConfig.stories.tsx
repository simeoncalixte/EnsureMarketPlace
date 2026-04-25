import React from 'react'
import { Meta, Story } from '@storybook/react'
import EmailIngestConfig from './EmailIngestConfig'

const meta: Meta = {
  title: 'Pages/Insurer Dashboard/Email Ingest Config',
  component: EmailIngestConfig,
  parameters: { layout: 'fullscreen' },
}

export default meta

export const Default: Story = () => <EmailIngestConfig />
