import React from 'react'
import type { Meta } from '@storybook/react'
import KYCVerification from './KYCVerification'

const meta: Meta = {
  title: 'Pages/Registration/KYCVerification'
}

export default meta

export const Default = () => (
  <div style={{ background: '#071129', minHeight: '100vh' }}>
    <KYCVerification />
  </div>
)
