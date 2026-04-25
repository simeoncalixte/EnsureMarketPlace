import React, { useState } from 'react'
import type { Meta } from '@storybook/react'
import SubNavigation from './SubNavigation'

const meta: Meta<typeof SubNavigation> = {
  title: 'XDS/SubNavigation'
}

export default meta

export const Default = () => {
  const [active, setActive] = useState('general')
  return (
    <SubNavigation
      tabs={[
        { id: 'general', label: 'General Info' },
        { id: 'allocation', label: 'Allocation Map' },
        { id: 'exposure', label: 'Exposure Logs' },
        { id: 'governance', label: 'Governance History' }
      ]}
      activeId={active}
      onChange={setActive}
    />
  )
}
