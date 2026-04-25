import React from 'react'
import type { Meta } from '@storybook/react'
import DataTable from './DataTable'

const meta: Meta<typeof DataTable> = {
  title: 'XDS/DataTable',
  component: DataTable
}

export default meta

export const Default = () => (
  <DataTable
    rows={[
      { id: '#SY-8821', tranche: 'Senior Secure', value: '1,240,000.00', status: 'ACTIVE', statusVariant: 'secondary' },
      { id: '#SY-4491', tranche: 'Mezzanine B', value: '450,200.00', status: 'PENDING', statusVariant: 'primary' },
      { id: '#SY-1022', tranche: 'Junior Equity', value: '88,000.50', status: 'HALTED', statusVariant: 'error' }
    ]}
  />
)
