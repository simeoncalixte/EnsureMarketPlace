import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import AnalyticsDashboard from './AnalyticsDashboard';

// AnalyticsDashboard is now a configurable dashboard surface (DashboardHost +
// the analytics widget registry). It no longer renders its own router/links, so
// the story relies on Storybook's global router decorator and does not nest a
// MemoryRouter of its own.
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
  return <AnalyticsDashboard />;
};
