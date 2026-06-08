import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import ActiveCoverage from './ActiveCoverage';

const meta: Meta = {
  title: 'Pages/Insurer Dashboard/Active Coverage',
  component: ActiveCoverage,
  parameters: { layout: 'fullscreen' },
};

export default meta;

export const Default: StoryFn = () => {
  if (typeof window !== 'undefined') {
    (window as any).__VITE_API_BASE = 'http://localhost:3001';
  }

  return (
    <MemoryRouter initialEntries={['/insurer/coverage-active']}>
      <Routes>
        <Route path="/insurer/coverage-active" element={<ActiveCoverage />} />
      </Routes>
    </MemoryRouter>
  );
};