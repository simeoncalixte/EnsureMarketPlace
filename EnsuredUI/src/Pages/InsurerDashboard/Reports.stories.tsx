import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import Reports from './Reports';

const meta: Meta = {
  title: 'Pages/Insurer Dashboard/Reports',
  component: Reports,
  parameters: { layout: 'fullscreen' },
};

export default meta;

export const Default: StoryFn = () => {
  if (typeof window !== 'undefined') {
    (window as any).__VITE_API_BASE = 'http://localhost:3001';
  }

  return (
    <MemoryRouter initialEntries={['/insurer/reports']}>
      <Routes>
        <Route path="/insurer/reports" element={<Reports />} />
      </Routes>
    </MemoryRouter>
  );
};