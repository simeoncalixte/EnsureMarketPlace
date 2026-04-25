import React, { useState } from 'react'
import type { Meta } from '@storybook/react'
import SegmentedSwitch from './SegmentedSwitch'

const meta: Meta<typeof SegmentedSwitch> = {
  title: 'XDS/SegmentedSwitch',
  component: SegmentedSwitch
}

export default meta

export const Default = () => {
  const [i, setI] = useState(0)
  return <SegmentedSwitch options={["Real-time", "Historical", "Projected"]} value={i} onChange={setI} />
}
