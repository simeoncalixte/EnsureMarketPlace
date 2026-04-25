import React from 'react'
import type { Meta } from '@storybook/react'
import TopNavBar from './TopNavBar'

const meta: Meta<typeof TopNavBar> = {
  title: 'XDS/TopNavBar',
  component: TopNavBar
}

export default meta

export const Default = () => <div style={{ background: '#071129' }}><TopNavBar /></div>
