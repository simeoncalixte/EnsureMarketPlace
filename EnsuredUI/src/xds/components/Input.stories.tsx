import React from 'react'
import type { Meta } from '@storybook/react'
import Input from './Input'

const meta: Meta<typeof Input> = {
  title: 'XDS/Input',
  component: Input
}

export default meta

export const Default = () => <Input placeholder="Enter alphanumeric key..." />

export const Search = () => <Input placeholder="Global asset search..." />
