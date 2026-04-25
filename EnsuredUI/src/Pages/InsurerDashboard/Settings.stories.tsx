import React from 'react';
import { Meta, Story } from '@storybook/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import Settings from './Settings';

const meta: Meta = {
  title: 'Pages/Insurer Dashboard/Settings',
  component: Settings,
  parameters: { layout: 'fullscreen' },
};

export default meta;

export const Default: Story = () => {
  if (typeof window !== 'undefined') {
    (window as any).__VITE_API_BASE = 'http://localhost:3001';
  }

  return (
    <MemoryRouter initialEntries={['/insurer/settings']}>
      <Routes>
        <Route path="/insurer/settings" element={<Settings />} />
      </Routes>
    </MemoryRouter>
  );
};