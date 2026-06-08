import React from 'react'
import { Meta, StoryFn } from '@storybook/react'
import ClaimsDashboard from './ClaimsDashboard'
import InsurerLayout from '../InsurerDashboard/InsurerLayout'
import { Routes, Route } from 'react-router'

const meta: Meta = {
  title: 'Pages/Claims Dashboard',
  component: ClaimsDashboard,
  parameters: { layout: 'fullscreen' }
}

export default meta

export const Default: StoryFn = () => {
  if (typeof window !== 'undefined') {
    (window as any).__VITE_API_BASE = 'http://localhost:3001'
  }
  return (
    <Routes>
      <Route path="/" element={<InsurerLayout />}>
        <Route index element={<ClaimsDashboard />} />
      </Route>
    </Routes>
  )
}
