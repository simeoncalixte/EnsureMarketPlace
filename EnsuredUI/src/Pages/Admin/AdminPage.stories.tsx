import React from 'react';
import { Meta, Story } from '@storybook/react';
import AdminPage from './AdminPage';

const meta: Meta = {
  title: 'Pages/Admin',
  component: AdminPage,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

export const Default: Story = () => {
  if (typeof window !== 'undefined') {
    (window as any).__VITE_API_BASE = 'http://localhost:3001';
  }
  return <AdminPage />;
};
