import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import AnalyticsDashboard from './AnalyticsDashboard';
import InsurerDashboard from './InsurerDashboard';

const meta: Meta = {
  title: 'Pages/Insurer Dashboard/Analytics Dashboard',
  component: AnalyticsDashboard,
  parameters: { layout: 'fullscreen' },
};

export default meta;

export const Default: StoryFn = () => {
  if (typeof window !== 'undefined') {
    (window as any).__VITE_API_BASE = 'http://localhost:3001';
  }

  return (
    <MemoryRouter initialEntries={['/insurer/dashboard']}>
      <Routes>
        <Route path="/insurer/dashboard" element={<AnalyticsDashboard />} />
        <Route path="/insurer/coverage/create" element={<InsurerDashboard />} />
      </Routes>
    </MemoryRouter>
  );
};