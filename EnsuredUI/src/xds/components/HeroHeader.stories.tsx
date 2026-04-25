import React from 'react'
import type { Meta } from '@storybook/react'
import HeroHeader from './HeroHeader'

const meta: Meta<typeof HeroHeader> = {
  title: 'XDS/HeroHeader',
  component: HeroHeader
}

export default meta

export const Default = () => (
  <HeroHeader tag="System Version 4.2.0" title="UI Component Guide" subtitle="The visual and interaction standard for high-fidelity reinsurance capital management. Quantitative precision meets sovereign aesthetics." />
)
