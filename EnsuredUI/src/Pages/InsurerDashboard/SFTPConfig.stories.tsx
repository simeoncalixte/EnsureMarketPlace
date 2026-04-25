import React from 'react'
import { Meta, Story } from '@storybook/react'
import SFTPConfig from './SFTPConfig'

const meta: Meta = {
  title: 'Pages/Insurer Dashboard/SFTP Config',
  component: SFTPConfig,
  parameters: { layout: 'fullscreen' },
}

export default meta

export const Default: Story = () => <SFTPConfig />
