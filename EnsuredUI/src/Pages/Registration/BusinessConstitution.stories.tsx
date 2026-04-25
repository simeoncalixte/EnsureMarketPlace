import React from 'react'
import type { Meta } from '@storybook/react'
import BusinessConstitution from './BusinessConstitution'

const meta: Meta = {
  title: 'Pages/Registration/BusinessConstitution'
}

export default meta

export const Default = () => (
  <div style={{ background: '#071129', minHeight: '100vh', padding: 24 }}>
    <BusinessConstitution />
  </div>
)
