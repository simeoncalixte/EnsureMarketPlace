import React from 'react'
import { Meta, Story } from '@storybook/react'
import CloudStorageConfig from './CloudStorageConfig'

export default {
  title: 'Pages/Insurer Dashboard/Cloud Storage Config',
  component: CloudStorageConfig,
  parameters: { layout: 'fullscreen' },
} as Meta

export const Default: Story = () => <CloudStorageConfig />
