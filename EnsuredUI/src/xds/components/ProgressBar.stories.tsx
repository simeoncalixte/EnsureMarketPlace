import React from 'react'
import type { Meta } from '@storybook/react'
import ProgressBar from './ProgressBar'

const meta: Meta<typeof ProgressBar> = {
  title: 'XDS/ProgressBar',
  component: ProgressBar
}

export default meta

export const Default = () => <ProgressBar value={82.4} />
