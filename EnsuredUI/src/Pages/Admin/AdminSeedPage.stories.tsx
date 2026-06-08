import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import AdminSeedPage from './AdminSeedPage';

const meta: Meta = {
  title: 'Pages/Admin/Seed',
  component: AdminSeedPage,
  parameters: { layout: 'fullscreen' },
};

export default meta;

export const Default: StoryFn = () => {
  // Ensure Storybook runs against local API by default
  if (typeof window !== 'undefined') {
    (window as any).__VITE_API_BASE = 'http://localhost:3001';
  }
  return <AdminSeedPage />;
};
