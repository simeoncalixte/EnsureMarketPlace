import React from 'react';
import { Meta, Story } from '@storybook/react';
import UsersSubpage from './UsersSubpage';

const meta: Meta = {
  title: 'Pages/Admin/Users',
  component: UsersSubpage,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

export const Default: Story = () => {
  if (typeof window !== 'undefined') {
    (window as any).__VITE_API_BASE = 'http://localhost:3001';
  }

  return <UsersSubpage />;
};