import React from 'react'
import type { Meta } from '@storybook/react'
import InvestmentType from './InvestmentType'

const meta: Meta = {
  title: 'Pages/Registration'
}

export default meta

export const InvestmentTypeStep = () => (
  <div style={{ background: '#071129', minHeight: '100vh' }}>
    <InvestmentType />
  </div>
)
