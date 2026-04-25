import React from 'react'
import type { Meta } from '@storybook/react'
import RoleSelection from './RoleSelection'

const meta: Meta = {
  title: 'Pages/Registration/RoleSelection'
}

export default meta

export const Default = () => (
  <div style={{ background: '#071129', minHeight: '100vh', padding: 24 }}>
    <RoleSelection />
  </div>
)
