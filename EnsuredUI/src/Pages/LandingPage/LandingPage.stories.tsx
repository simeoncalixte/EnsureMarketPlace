import React from 'react'
import type { Meta } from '@storybook/react'
import LandingPage from './LandingPage'

const meta: Meta = {
  title: 'Pages/LandingPage'
}

export default meta

export const Default = () => <div style={{ background: '#071129', minHeight: '100vh', padding: 40 }}><LandingPage /></div>
