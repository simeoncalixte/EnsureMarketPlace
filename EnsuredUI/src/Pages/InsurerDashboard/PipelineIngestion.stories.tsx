import React from 'react'
import { Meta, Story } from '@storybook/react'
import PipelineIngestion from './PipelineIngestion'

const meta: Meta = {
  title: 'Pages/Insurer Dashboard/Pipeline & Ingestion',
  component: PipelineIngestion,
  parameters: { layout: 'fullscreen' },
}

export default meta

export const Default: Story = () => {
  if (typeof window !== 'undefined') {
    ;(window as any).__VITE_API_BASE = 'http://localhost:3001'
  }

  return <PipelineIngestion />
}
